"""
Document upload and processing routes.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from database.connection import get_db
from database.models import Document, ExtractedField, Match, Mismatch, Export
from services.ocr_service import OCRService
from services.extraction_service import ExtractionService
from services.matching_service import MatchingService
from services.export_service import ExportService
from auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
import logging

# Get logger - will inherit configuration from root logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

ocr_service = OCRService()
extraction_service = ExtractionService()
matching_service = MatchingService()
export_service = ExportService()


class DocumentStatusResponse(BaseModel):
    """Document status response."""
    id: int
    filename: str
    status: str
    created_at: datetime
    updated_at: datetime


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document for processing.
    
    Accepts: PDF, JPG, PNG, TIFF
    """
    # Validate file type
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif'}
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Determine MIME type
    mime_types = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.tiff': 'image/tiff',
        '.tif': 'image/tiff'
    }
    mime_type = mime_types.get(file_ext, 'application/octet-stream')
    
    # Log upload start
    logger.info(f"📤 Starting upload for file: {file.filename}")
    
    try:
        # Upload to GCS
        logger.info("☁️ Uploading to Google Cloud Storage...")
        try:
            gcs_uri = ocr_service.upload_to_gcs(file_content, file.filename)
            logger.info(f"✅ Uploaded to GCS: {gcs_uri}")
        except Exception as e:
            logger.error(f"❌ GCS upload failed: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to upload to GCS: {str(e)}")
        
        # Create document record
        logger.info("💾 Creating document record in database...")
        document = Document(
            filename=file.filename,
            gcs_uri=gcs_uri,
            status='pending'
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        logger.info(f"✅ Document record created with ID: {document.id}")
        
        # Process document in background
        logger.info(f"📤 Adding background task for document {document.id}")
        background_tasks.add_task(process_document_task, document.id, gcs_uri, mime_type)
        logger.info(f"✅ Background task added for document {document.id}")
        
        return {
            "id": document.id,
            "doc_id": document.id,  # For frontend compatibility
            "filename": document.filename,
            "status": document.status,
            "message": "Document uploaded successfully. Processing in background."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading document: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading document: {str(e)}")


def process_document_task(doc_id: int, gcs_uri: str, mime_type: str):
    """
    Background task to process document.
    """
    import traceback
    
    # Get logger for background task (use module logger)
    bg_logger = logging.getLogger(__name__)
    
    bg_logger.info("=" * 80)
    bg_logger.info("🔍 BACKGROUND TASK STARTED - PROCESSING DOCUMENT")
    bg_logger.info("=" * 80)
    
    bg_logger.info(f"🚀 Starting background task for document {doc_id}")
    bg_logger.info(f"GCS URI: {gcs_uri}, MIME type: {mime_type}")
    
    from database.connection import SessionLocal
    from services.ocr_service import OCRService
    from services.extraction_service import ExtractionService
    from services.matching_service import MatchingService
    
    db = SessionLocal()
    
    # Initialize services - ensure we can update status even if this fails
    try:
        ocr_service = OCRService()
        extraction_service = ExtractionService()
        matching_service = MatchingService()
        bg_logger.info("✅ Services initialized")
    except Exception as e:
        bg_logger.error(f"❌ Failed to initialize services: {str(e)}", exc_info=True)
        # Update status to failed before returning
        try:
            document = db.query(Document).filter(Document.id == doc_id).first()
            if document:
                document.status = 'failed'
                db.commit()
                bg_logger.info(f"✅ Updated document {doc_id} status to 'failed' due to service initialization error")
                try:
                    from routes.websocket import broadcast_status_update_sync
                    broadcast_status_update_sync(doc_id, 'failed', f'Service initialization failed: {str(e)}')
                except:
                    pass
        except Exception as e2:
            bg_logger.error(f"❌ Failed to update status on service init error: {str(e2)}", exc_info=True)
        finally:
            db.close()
        return
    
    try:
        # Update status to processing
        document = db.query(Document).filter(Document.id == doc_id).first()
        if not document:
            bg_logger.error(f"❌ Document {doc_id} not found in database")
            db.close()
            return
        
        bg_logger.info(f"📄 Found document: {document.filename}")
        document.status = 'processing'
        db.commit()
        bg_logger.info("✅ Status updated to 'processing'")
        
        # Broadcast status update
        try:
            from routes.websocket import broadcast_status_update_sync
            broadcast_status_update_sync(doc_id, 'processing', 'Processing document...')
            bg_logger.debug("✅ Status broadcast sent")
        except Exception as e:
            bg_logger.warning(f"⚠️ Failed to broadcast status: {str(e)}")
        
        # Run OCR
        bg_logger.info("🔍 Starting OCR processing...")
        bg_logger.info(f"📋 Using Document AI Processor: {ocr_service.processor_name}")
        ocr_result = ocr_service.process_document_from_gcs(gcs_uri)
        bg_logger.debug(f"OCR result success: {ocr_result.get('success')}")
        
        if not ocr_result.get('success'):
            error_msg = ocr_result.get('error', 'Unknown OCR error')
            bg_logger.error(f"❌ OCR processing failed: {error_msg}")
            document.status = 'failed'
            db.commit()
            try:
                from routes.websocket import broadcast_status_update_sync
                broadcast_status_update_sync(doc_id, 'failed', f'OCR failed: {error_msg}')
            except:
                pass
            return
        
        # Log OCR results
        full_text = ocr_result.get('full_text', '')
        entities = ocr_result.get('entities', {})
        bg_logger.info(f"📄 OCR extracted {len(full_text)} characters of text")
        bg_logger.info(f"📋 OCR found {len(entities)} entities: {list(entities.keys())}")
        
        # Log first 500 chars of OCR text for debugging
        if full_text:
            preview = full_text[:500].replace('\n', '\\n')
            bg_logger.debug(f"📝 OCR Text Preview (first 500 chars): {preview}")
        
        # Log entities found with page numbers
        if entities:
            bg_logger.debug("📋 Entities from Document AI:")
            entity_pages = ocr_result.get('entity_pages', {})
            for entity_type, entity_data in entities.items():
                page_num = entity_pages.get(entity_type, entity_data.get('page_number', 1))
                print(f"  - {entity_type}: {entity_data.get('value', 'N/A')} (confidence: {entity_data.get('confidence', 0)}, page: {page_num})")
                bg_logger.debug(f"  - {entity_type}: {entity_data.get('value', 'N/A')} (confidence: {entity_data.get('confidence', 0)}, page: {page_num})")
        
        # Extract fields
        bg_logger.info("📝 Extracting fields from OCR result...")
        extracted_fields = extraction_service.extract_fields(ocr_result)
        bg_logger.info(f"✅ Extracted {len(extracted_fields)} fields: {list(extracted_fields.keys())}")
        
        # Log extracted fields detail
        bg_logger.debug("=" * 60)
        bg_logger.debug("📊 EXTRACTED FIELDS DETAIL:")
        bg_logger.debug("=" * 60)
        if extracted_fields:
            for field_name, field_data in extracted_fields.items():
                bg_logger.debug(f"  Field: {field_name}")
                bg_logger.debug(f"    Raw Value: {field_data.get('raw_value', 'N/A')}")
                bg_logger.debug(f"    Normalized Value: {field_data.get('normalized_value', 'N/A')}")
                bg_logger.debug(f"    Confidence: {field_data.get('confidence', 0)}")
                bg_logger.debug(f"    Page Number: {field_data.get('page_number', 1)}")
        else:
            bg_logger.warning("⚠️  NO FIELDS EXTRACTED!")
            bg_logger.warning(f"   Full text length: {len(full_text)}")
            bg_logger.warning(f"   Entities found: {len(entities)}")
        bg_logger.debug("=" * 60)
        
        # Save extracted fields
        try:
            for field_name, field_data in extracted_fields.items():
                # Ensure page_number is a valid integer (not None)
                page_num = field_data.get('page_number')
                if page_num is None or not isinstance(page_num, int) or page_num < 1:
                    page_num = 1
                    bg_logger.warning(f"⚠️  Invalid page_number for field '{field_name}': {field_data.get('page_number')}, defaulting to 1")
                
                extracted_field = ExtractedField(
                    doc_id=doc_id,
                    field_name=field_name,
                    raw_value=field_data.get('raw_value'),
                    normalized_value=field_data.get('normalized_value'),
                    confidence_score=field_data.get('confidence'),
                    page_number=page_num
                )
                db.add(extracted_field)
                bg_logger.debug(f"💾 Saving field '{field_name}' with page_number={page_num}")
            
            db.commit()
            bg_logger.info("✅ Extracted fields saved to database")
        except Exception as e:
            db.rollback()
            bg_logger.error(f"❌ Error saving extracted fields: {str(e)}", exc_info=True)
            # If it's a column missing error, log it but continue (fields might still save without page_number)
            if 'page_number' in str(e).lower() or 'column' in str(e).lower():
                bg_logger.warning("⚠️  page_number column might be missing. Trying to save fields without page_number...")
                # Try saving without page_number as fallback
                try:
                    for field_name, field_data in extracted_fields.items():
                        extracted_field = ExtractedField(
                            doc_id=doc_id,
                            field_name=field_name,
                            raw_value=field_data.get('raw_value'),
                            normalized_value=field_data.get('normalized_value'),
                            confidence_score=field_data.get('confidence')
                            # Skip page_number if column doesn't exist
                        )
                        db.add(extracted_field)
                    db.commit()
                    bg_logger.info("✅ Extracted fields saved (without page_number)")
                except Exception as e2:
                    bg_logger.error(f"❌ Failed to save fields even without page_number: {str(e2)}")
                    raise  # Re-raise to trigger outer exception handler
            else:
                raise  # Re-raise other database errors
        
        # Broadcast extracting fields status
        try:
            from routes.websocket import broadcast_status_update_sync
            broadcast_status_update_sync(doc_id, 'processing', 'Extracting fields...')
        except:
            pass
        
        # Match against client profiles
        bg_logger.info("🔍 Matching against client profiles...")
        matched_client_id, match_score, decision = matching_service.match_document(
            db, doc_id, extracted_fields
        )
        bg_logger.info(f"✅ Match result: client_id={matched_client_id}, score={match_score}, decision={decision}")
        
        # Detect mismatches
        if matched_client_id:
            bg_logger.info("🔍 Detecting mismatches...")
            mismatches = matching_service.detect_mismatches(
                db, doc_id, matched_client_id, extracted_fields
            )
            bg_logger.info(f"✅ Found {len(mismatches)} mismatches")
        
        # Update status
        document.status = 'completed'
        db.commit()
        bg_logger.info("✅ Document processing completed successfully!")
        
        # Broadcast completion
        try:
            from routes.websocket import broadcast_status_update_sync
            broadcast_status_update_sync(doc_id, 'completed', 'Document processed successfully')
        except:
            pass
        
    except Exception as e:
        bg_logger.error(f"❌ Error processing document {doc_id}: {str(e)}", exc_info=True)
        # Update status to failed
        try:
            document = db.query(Document).filter(Document.id == doc_id).first()
            if document:
                document.status = 'failed'
                db.commit()
                from routes.websocket import broadcast_status_update_sync
                broadcast_status_update_sync(doc_id, 'failed', f'Processing failed: {str(e)}')
        except Exception as e2:
            bg_logger.error(f"❌ Failed to update status: {str(e2)}", exc_info=True)
    finally:
        db.close()
        bg_logger.info(f"🏁 Background task completed for document {doc_id}")


@router.get("/")
def list_documents(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all documents."""
    logger.info("📋 Listing all documents")
    
    try:
        logger.debug("🔍 Querying database for documents...")
        documents = db.query(Document).order_by(Document.created_at.desc()).all()
        
        logger.info(f"✅ Found {len(documents)} documents in database")
        
        # Log document statuses
        status_counts = {}
        for doc in documents:
            status_counts[doc.status] = status_counts.get(doc.status, 0) + 1
        
        logger.debug(f"📊 Document status breakdown: {status_counts}")
        
        result = {
            "documents": [
                {
                    "doc_id": doc.id,
                    "filename": doc.filename,
                    "status": doc.status,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                    "completed_at": doc.updated_at.isoformat() if doc.status == "completed" and doc.updated_at else None,
                }
                for doc in documents
            ]
        }
        
        logger.info(f"✅ Returning {len(result['documents'])} documents to client")
        
        return result
    except Exception as e:
        logger.error(f"❌ Error listing documents: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Database connection error: {str(e)}. Please check database environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) are set correctly."
        )


@router.get("/{doc_id}")
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get document details."""
    document = db.query(Document).filter(Document.id == doc_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "document": {
            "doc_id": document.id,
            "filename": document.filename,
            "status": document.status,
            "created_at": document.created_at.isoformat() if document.created_at else None,
            "updated_at": document.updated_at.isoformat() if document.updated_at else None,
        }
    }


@router.get("/{doc_id}/status")
def get_document_status(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get document processing status."""
    document = db.query(Document).filter(Document.id == doc_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentStatusResponse(
        id=document.id,
        filename=document.filename,
        status=document.status,
        created_at=document.created_at,
        updated_at=document.updated_at
    )


@router.get("/{doc_id}/extracted-fields")
def get_extracted_fields(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get extracted fields for a document."""
    document = db.query(Document).filter(Document.id == doc_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Only get the 3 fields: patient_name, dob, doa (exclude referral and service_dates)
    fields = db.query(ExtractedField).filter(
        ExtractedField.doc_id == doc_id,
        ExtractedField.field_name.in_(['patient_name', 'dob', 'doa'])
    ).all()
    
    # Format field names for better display
    field_name_map = {
        'patient_name': 'Patient Name',
        'dob': 'Date of Birth',
        'doa': 'Date of Accident'
    }
    
    return {
        "fields": [
            {
                "field_name": field_name_map.get(field.field_name, field.field_name.replace('_', ' ').title()),
                "value_raw": field.raw_value,
                "value_norm": field.normalized_value,
                "confidence": field.confidence_score,
                "page_num": field.page_number if field.page_number else 1
            }
            for field in fields
        ]
    }


@router.delete("/all")
def delete_all_documents(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete all documents and their related data (extracted fields, matches, mismatches, exports).
    
    This will NOT delete the client dataset (client_profiles).
    """
    try:
        # Count records before deletion for response
        doc_count = db.query(func.count(Document.id)).scalar()
        extracted_fields_count = db.query(func.count(ExtractedField.id)).scalar()
        matches_count = db.query(func.count(Match.id)).scalar()
        mismatches_count = db.query(func.count(Mismatch.id)).scalar()
        exports_count = db.query(func.count(Export.id)).scalar()
        
        logger.info(f"🗑️ Starting deletion of all documents and related data...")
        logger.info(f"   Documents: {doc_count}")
        logger.info(f"   Extracted Fields: {extracted_fields_count}")
        logger.info(f"   Matches: {matches_count}")
        logger.info(f"   Mismatches: {mismatches_count}")
        logger.info(f"   Exports: {exports_count}")
        
        # Delete all documents (CASCADE will handle related records)
        deleted_docs = db.query(Document).delete()
        db.commit()
        
        logger.info(f"✅ Successfully deleted {deleted_docs} documents and all related data")
        
        return {
            "message": "All documents and related data deleted successfully",
            "deleted": {
                "documents": deleted_docs,
                "extracted_fields": extracted_fields_count,
                "matches": matches_count,
                "mismatches": mismatches_count,
                "exports": exports_count
            },
            "note": "Client dataset (client_profiles) was NOT deleted"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting documents: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting documents: {str(e)}"
        )


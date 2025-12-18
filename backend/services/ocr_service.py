"""
OCR service using Google Document AI.
"""
from google.cloud import documentai
from google.cloud.documentai import DocumentProcessorServiceClient
from google.cloud import storage
from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import io

load_dotenv()


class OCRSettings(BaseSettings):
    """OCR configuration."""
    project_id: str = os.getenv("PROJECT_ID", "")
    location: str = os.getenv("LOCATION", "us")
    processor_id: str = os.getenv("PROCESSOR_ID", "")
    gcs_bucket_name: str = os.getenv("GCS_BUCKET_NAME", "")

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields from .env


class OCRService:
    """Service for OCR operations using Google Document AI."""

    def __init__(self):
        """Initialize OCR service."""
        self.settings = OCRSettings()
        self.client = DocumentProcessorServiceClient()
        self.storage_client = storage.Client()
        self.processor_name = f"projects/{self.settings.project_id}/locations/{self.settings.location}/processors/{self.settings.processor_id}"

    def upload_to_gcs(self, file_content: bytes, filename: str) -> str:
        """
        Upload file to Google Cloud Storage.
        
        Args:
            file_content: File content as bytes
            filename: Name of the file
            
        Returns:
            GCS URI of the uploaded file
        """
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"📤 Uploading {filename} to GCS bucket: {self.settings.gcs_bucket_name}")
            
            bucket = self.storage_client.bucket(self.settings.gcs_bucket_name)
            blob = bucket.blob(f"documents/{filename}")
            blob.upload_from_string(file_content, content_type=self._get_content_type(filename))
            
            gcs_uri = f"gs://{self.settings.gcs_bucket_name}/documents/{filename}"
            logger.info(f"✅ File uploaded to: {gcs_uri}")
            return gcs_uri
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ GCS upload failed: {str(e)}")
            raise

    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension."""
        ext = filename.lower().split('.')[-1]
        content_types = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'tiff': 'image/tiff',
            'tif': 'image/tiff'
        }
        return content_types.get(ext, 'application/octet-stream')

    def process_document(self, file_content: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Process document using Document AI.
        
        Args:
            file_content: File content as bytes
            mime_type: MIME type of the file
            
        Returns:
            Dictionary containing OCR results
        """
        try:
            # Create raw document
            raw_document = documentai.RawDocument(
                content=file_content,
                mime_type=mime_type
            )

            # Configure the process request
            request = documentai.ProcessRequest(
                name=self.processor_name,
                raw_document=raw_document
            )

            # Process the document using the service client
            result = self.client.process_document(request=request)
            document = result.document

            # Extract text and entities
            full_text = document.text if hasattr(document, 'text') else ''
            entities = {}
            
            import logging
            ocr_logger = logging.getLogger(__name__)
            ocr_logger.info(f"📄 Document AI returned text length: {len(full_text)}")
            ocr_logger.info(f"📋 Document has entities: {hasattr(document, 'entities')}")
            
            if hasattr(document, 'entities'):
                entity_list = list(document.entities) if document.entities else []
                ocr_logger.info(f"📋 Processing {len(entity_list)} entities from Document AI")
                
                for idx, entity in enumerate(entity_list):
                    # Get entity type - try multiple attributes
                    entity_type = 'unknown'
                    if hasattr(entity, 'type_'):
                        entity_type = entity.type_
                    elif hasattr(entity, 'type'):
                        entity_type = entity.type
                    
                    entity_value = ''
                    confidence = 0.0
                    
                    # PRIORITY: Use mention_text first (most reliable, like old code)
                    if hasattr(entity, 'mention_text') and entity.mention_text:
                        entity_value = entity.mention_text
                        ocr_logger.info(f"   Entity {idx+1}: Using mention_text for {entity_type}")
                    
                    # Fallback: Try text_anchor with text_segments
                    if not entity_value and hasattr(entity, 'text_anchor') and entity.text_anchor:
                        if hasattr(entity.text_anchor, 'text_segments'):
                            for segment in entity.text_anchor.text_segments:
                                if hasattr(segment, 'start_index') and hasattr(segment, 'end_index'):
                                    start = segment.start_index
                                    end = segment.end_index
                                    if hasattr(document, 'text') and document.text:
                                        entity_value = document.text[start:end]
                                        ocr_logger.info(f"   Entity {idx+1}: Using text_segments for {entity_type}")
                                        break
                        # Method 2: text_anchor.content (if available)
                        elif hasattr(entity.text_anchor, 'content'):
                            entity_value = entity.text_anchor.content
                    
                    # Fallback: normalized_value
                    if not entity_value and hasattr(entity, 'normalized_value'):
                        entity_value = entity.normalized_value
                    
                    # Get confidence
                    if hasattr(entity, 'confidence'):
                        confidence = entity.confidence
                    elif hasattr(entity, 'confidence_score'):
                        confidence = entity.confidence_score
                    
                    ocr_logger.info(f"   Entity {idx+1}: type={entity_type}, value={entity_value[:50] if entity_value else 'N/A'}, confidence={confidence:.2f}")
                    
                    if entity_type and entity_value:
                        # Keep the entity with highest confidence if duplicate types
                        if entity_type not in entities or entities[entity_type].get('confidence', 0) < confidence:
                            entities[entity_type] = {
                                'value': entity_value,
                                'confidence': confidence
                            }
            else:
                ocr_logger.warning("⚠️  Document does not have 'entities' attribute")
            
            ocr_logger.info(f"✅ Processed {len(entities)} unique entity types: {list(entities.keys())}")

            return {
                'full_text': full_text,
                'entities': entities,
                'pages': len(document.pages) if hasattr(document, 'pages') and document.pages else 0,
                'success': True
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'full_text': '',
                'entities': {}
            }

    def process_document_from_gcs(self, gcs_uri: str) -> Dict[str, Any]:
        """
        Process document from GCS URI.
        
        Args:
            gcs_uri: GCS URI of the document (gs://bucket/path)
            
        Returns:
            Dictionary containing OCR results
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"🔍 Processing document from GCS: {gcs_uri}")
            
            # Parse GCS URI
            if not gcs_uri.startswith('gs://'):
                raise ValueError("Invalid GCS URI format")
            
            parts = gcs_uri.replace('gs://', '').split('/', 1)
            bucket_name = parts[0]
            blob_name = parts[1] if len(parts) > 1 else ''
            
            logger.info(f"📥 Downloading from bucket: {bucket_name}, blob: {blob_name}")
            
            # Get blob from GCS
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            file_content = blob.download_as_bytes()
            
            logger.info(f"✅ Downloaded {len(file_content)} bytes")
            
            # Determine MIME type
            mime_type = blob.content_type or 'application/pdf'
            logger.info(f"📄 MIME type: {mime_type}")
            
            logger.info(f"🤖 Calling Document AI processor: {self.processor_name}")
            logger.info(f"   Project ID: {self.settings.project_id}")
            logger.info(f"   Location: {self.settings.location}")
            logger.info(f"   Processor ID: {self.settings.processor_id}")
            
            result = self.process_document(file_content, mime_type)
            
            if result.get('success'):
                full_text = result.get('full_text', '')
                entities = result.get('entities', {})
                logger.info(f"✅ OCR successful. Extracted {len(full_text)} characters")
                logger.info(f"   Found {len(entities)} entities from Document AI")
                if entities:
                    logger.info(f"   Entity types: {list(entities.keys())}")
            else:
                logger.error(f"❌ OCR failed: {result.get('error')}")
            
            return result
        except Exception as e:
            import traceback
            logger.error(f"❌ Error processing document from GCS: {str(e)}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e),
                'full_text': '',
                'entities': {}
            }


"""
Export routes.
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Export, Document
from services.export_service import ExportService
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import base64
import logging

router = APIRouter(prefix="/exports", tags=["exports"])
logger = logging.getLogger(__name__)

export_service = ExportService()


class ExportResponse(BaseModel):
    """Export response."""
    export_id: int
    gcs_uri: Optional[str] = None
    signed_url: Optional[str] = None
    expires_at: Optional[str] = None
    file_content: Optional[str] = None
    filename: Optional[str] = None
    direct_download: bool = False


@router.get("/{doc_id}")
def get_export(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate or retrieve Excel export for a document.
    """
    # Check if document exists
    document = db.query(Document).filter(Document.id == doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if document is completed
    if document.status != 'completed':
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready for export. Status: {document.status}"
        )
    
    # Check if export already exists
    existing_export = db.query(Export).filter(Export.doc_id == doc_id).first()
    
    if existing_export:
        # Check if signed URL is still valid
        from datetime import datetime
        if existing_export.expires_at and existing_export.expires_at > datetime.now():
            return ExportResponse(
                export_id=existing_export.id,
                gcs_uri=existing_export.gcs_uri,
                signed_url=existing_export.signed_url,
                expires_at=existing_export.expires_at.isoformat()
            )
    
    # Generate new export
    try:
        export_data = export_service.generate_excel_report(db, doc_id)
        
        # If direct download (GCS failed), return file directly
        if export_data.get('direct_download') and export_data.get('file_content'):
            file_content = base64.b64decode(export_data['file_content'])
            filename = export_data.get('filename', f'report_{doc_id}.xlsx')
            
            return Response(
                content=file_content,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"'
                }
            )
        
        # Otherwise return signed URL response
        return ExportResponse(**export_data)
    except Exception as e:
        logger.error(f"❌ Error generating export: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating export: {str(e)}")


"""
Statistics routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import Document, Match, Mismatch
from auth import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
def get_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get system statistics."""
    # Count documents by status
    total_docs = db.query(func.count(Document.id)).scalar() or 0
    completed_docs = db.query(func.count(Document.id)).filter(
        Document.status == "completed"
    ).scalar() or 0
    processing_docs = db.query(func.count(Document.id)).filter(
        Document.status.in_(["pending", "processing"])
    ).scalar() or 0
    failed_docs = db.query(func.count(Document.id)).filter(
        Document.status == "failed"
    ).scalar() or 0
    
    # Count matches
    total_matches = db.query(func.count(Match.id)).scalar() or 0
    
    # Count mismatches
    total_mismatches = db.query(func.count(Mismatch.id)).scalar() or 0
    
    return {
        "total_documents": total_docs,
        "completed_documents": completed_docs,
        "processing_documents": processing_docs,
        "failed_documents": failed_docs,
        "total_matches": total_matches,
        "total_mismatches": total_mismatches
    }


"""
Match information routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Match, Document, ClientProfile, ExtractedField, Mismatch

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/{doc_id}")
def get_match_info(
    doc_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed match information for a document, including field-by-field matching."""
    # Check if document exists
    document = db.query(Document).filter(Document.id == doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get match
    match = db.query(Match).filter(Match.doc_id == doc_id).first()
    
    if not match:
        return {
            "client_id": None,
            "score": None,
            "decision": "No match found yet",
            "client_name": None,
            "field_matches": {}
        }
    
    # Get matched client profile
    client = db.query(ClientProfile).filter(ClientProfile.id == match.client_id).first()
    client_name = client.name if client else None
    
    # Get extracted fields
    extracted_fields = db.query(ExtractedField).filter(
        ExtractedField.doc_id == doc_id
    ).all()
    
    # Get mismatches
    mismatches = db.query(Mismatch).filter(
        Mismatch.doc_id == doc_id
    ).all()
    
    # Create mismatch lookup
    mismatch_lookup = {m.field: m for m in mismatches}
    
    # Build field-by-field matching information
    field_matches = {}
    
    # Field mapping: extracted field name -> display name
    field_display_map = {
        'patient_name': 'Patient Name',
        'dob': 'Date of Birth',
        'doa': 'Date of Accident',
        'referral': 'Referral Number'
    }
    
    # Check each field
    for field in extracted_fields:
        field_name = field.field_name
        display_name = field_display_map.get(field_name, field_name.replace('_', ' ').title())
        
        extracted_value = field.normalized_value or field.raw_value
        
        # Determine match status
        match_status = "not_checked"  # Default
        expected_value = None
        is_match = None
        
        if field_name == 'patient_name':
            # Name matching is done at document level
            if match and match.decision in ['match', 'ambiguous']:
                match_status = "matched"
                is_match = True
                expected_value = client_name if client else None
            else:
                match_status = "not_matched"
                is_match = False
                expected_value = client_name if client else None
        
        elif field_name in ['dob', 'doa']:
            # Check if there's a mismatch record
            if field_name in mismatch_lookup:
                mismatch = mismatch_lookup[field_name]
                match_status = "mismatch"
                is_match = False
                expected_value = mismatch.expected_value
            elif client:
                # Check if client has this field and it matches
                client_value = None
                if field_name == 'dob' and client.dob:
                    client_value = client.dob.strftime('%Y-%m-%d')
                elif field_name == 'doa' and client.doa:
                    client_value = client.doa.strftime('%Y-%m-%d')
                
                if client_value:
                    if extracted_value == client_value:
                        match_status = "matched"
                        is_match = True
                        expected_value = client_value
                    else:
                        match_status = "mismatch"
                        is_match = False
                        expected_value = client_value
                else:
                    # Client doesn't have this field in dataset
                    match_status = "not_in_dataset"
                    is_match = None
                    expected_value = None
            else:
                match_status = "not_in_dataset"
                is_match = None
                expected_value = None
        
        elif field_name == 'referral':
            # Referral is not matched against dataset (optional field)
            match_status = "not_applicable"
            is_match = None
            expected_value = None
        
        field_matches[field_name] = {
            "display_name": display_name,
            "extracted_value": extracted_value,
            "expected_value": expected_value,
            "match_status": match_status,
            "is_match": is_match,
            "confidence": field.confidence_score
        }
    
    return {
        "client_id": match.client_id,
        "client_name": client_name,
        "score": match.match_score,
        "decision": match.decision,
        "field_matches": field_matches
    }


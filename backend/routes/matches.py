"""
Match information routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Match, Document, ClientProfile, ExtractedField, Mismatch
from auth import get_current_user

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/{doc_id}")
def get_match_info(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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
    
    # Get extracted fields - only the 3 fields: patient_name, dob, doa (exclude referral)
    extracted_fields = db.query(ExtractedField).filter(
        ExtractedField.doc_id == doc_id,
        ExtractedField.field_name.in_(['patient_name', 'dob', 'doa'])
    ).all()
    
    # Get mismatches with page numbers
    mismatches = db.query(Mismatch).filter(
        Mismatch.doc_id == doc_id
    ).all()
    
    # Create mismatch lookup (includes page_number)
    mismatch_lookup = {m.field: m for m in mismatches}
    
    # Also create a list of mismatches with full details for response
    mismatch_details = [
        {
            "field": m.field,
            "expected_value": m.expected_value,
            "observed_value": m.observed_value,
            "page_number": m.page_number or 1
        }
        for m in mismatches
    ]
    
    # Build field-by-field matching information
    field_matches = {}
    
    # Field mapping: extracted field name -> display name
    field_display_map = {
        'patient_name': 'Patient Name',
        'dob': 'Date of Birth',
        'doa': 'Date of Accident'
    }
    
    # Check each field
    for field in extracted_fields:
        field_name = field.field_name
        display_name = field_display_map.get(field_name, field_name.replace('_', ' ').title())
        
        # Get extracted value - ensure dates are in MM/DD/YYYY format
        extracted_value = field.normalized_value or field.raw_value
        # If it's a date field and not already in MM/DD/YYYY, try to normalize it
        if field_name in ['dob', 'doa'] and extracted_value:
            # Check if it's already in MM/DD/YYYY format
            import re
            if not re.match(r'^\d{2}/\d{2}/\d{4}$', extracted_value):
                # Try to convert from other formats
                try:
                    from dateutil import parser as date_parser
                    date_obj = date_parser.parse(extracted_value, fuzzy=True)
                    extracted_value = date_obj.strftime('%m/%d/%Y')
                except:
                    # If parsing fails, use as-is
                    pass
        
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
            # Initialize page_number from field
            page_number = field.page_number if hasattr(field, 'page_number') and field.page_number else 1
            
            # Check if there's a mismatch record
            if field_name in mismatch_lookup:
                mismatch = mismatch_lookup[field_name]
                match_status = "mismatch"
                is_match = False
                expected_value = mismatch.expected_value
                page_number = mismatch.page_number if mismatch.page_number else page_number  # Use mismatch page number if available
            elif client:
                # Check if client has this field and it matches
                client_value = None
                if field_name == 'dob' and client.dob:
                    client_value = client.dob.strftime('%m/%d/%Y')  # Use MM/DD/YYYY format
                elif field_name == 'doa' and client.doa:
                    client_value = client.doa.strftime('%m/%d/%Y')  # Use MM/DD/YYYY format
                
                if client_value:
                    # Compare normalized values (both should be in MM/DD/YYYY format)
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
        
        
        # Get page number for this field
        if field_name in ['dob', 'doa'] and 'page_number' in locals():
            field_page_number = page_number
        else:
            field_page_number = field.page_number if hasattr(field, 'page_number') and field.page_number else 1
        
        field_matches[field_name] = {
            "display_name": display_name,
            "extracted_value": extracted_value,
            "expected_value": expected_value,
            "match_status": match_status,
            "is_match": is_match,
            "confidence": field.confidence_score,
            "page_number": field_page_number
        }
    
    return {
        "client_id": match.client_id,
        "client_name": client_name,
        "score": match.match_score,
        "decision": match.decision,
        "field_matches": field_matches,
        "mismatches": mismatch_details  # Include full mismatch details with page numbers
    }


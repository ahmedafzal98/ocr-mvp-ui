"""
Service for matching extracted data against client profiles.
"""
from rapidfuzz import fuzz
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from database.models import ClientProfile, ExtractedField, Match, Mismatch
import re


class MatchingService:
    """Service for matching documents to client profiles."""

    # Thresholds for matching
    NAME_MATCH_THRESHOLD = 80  # Jaro-Winkler similarity threshold
    HIGH_CONFIDENCE_THRESHOLD = 90
    LOW_CONFIDENCE_THRESHOLD = 70

    def match_document(
        self, 
        db: Session, 
        doc_id: int, 
        extracted_fields: Dict[str, Dict[str, Any]]
    ) -> Tuple[Optional[int], float, str]:
        """
        Match document to client profiles.
        
        Args:
            db: Database session
            doc_id: Document ID
            extracted_fields: Dictionary of extracted fields
            
        Returns:
            Tuple of (matched_client_id, match_score, decision)
        """
        # Get extracted name
        name_field = extracted_fields.get('patient_name')
        if not name_field:
            return None, 0.0, 'no_match'
        
        extracted_name = name_field.get('normalized_value', '')
        if not extracted_name:
            return None, 0.0, 'no_match'
        
        # Get all client profiles
        clients = db.query(ClientProfile).all()
        
        if not clients:
            return None, 0.0, 'no_match'
        
        # Calculate match scores for all clients
        matches = []
        for client in clients:
            client_name = self._normalize_name(client.name)
            score = fuzz.WRatio(extracted_name, client_name)
            matches.append((client.id, score))
        
        # Sort by score descending
        matches.sort(key=lambda x: x[1], reverse=True)
        
        if not matches:
            return None, 0.0, 'no_match'
        
        best_match = matches[0]
        best_client_id, best_score = best_match
        
        # Determine decision
        if best_score >= self.HIGH_CONFIDENCE_THRESHOLD:
            decision = 'match'
        elif best_score >= self.LOW_CONFIDENCE_THRESHOLD:
            # Check if there's a close second match
            if len(matches) > 1 and matches[1][1] >= self.LOW_CONFIDENCE_THRESHOLD:
                decision = 'ambiguous'
            else:
                decision = 'match'
        else:
            decision = 'no_match'
        
        # Save match record
        match_record = Match(
            doc_id=doc_id,
            client_id=best_client_id,
            match_score=best_score,
            decision=decision
        )
        db.add(match_record)
        db.commit()
        
        return best_client_id, best_score, decision

    def detect_mismatches(
        self,
        db: Session,
        doc_id: int,
        client_id: int,
        extracted_fields: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect mismatches between extracted and expected values.
        
        Args:
            db: Database session
            doc_id: Document ID
            client_id: Matched client ID
            extracted_fields: Dictionary of extracted fields
            
        Returns:
            List of mismatch dictionaries
        """
        # Get client profile
        client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
        if not client:
            return []
        
        mismatches = []
        
        # Check DoB mismatch
        dob_field = extracted_fields.get('dob')
        if dob_field:
            extracted_dob = dob_field.get('normalized_value')
            # Convert expected date to MM/DD/YYYY format to match extracted format
            expected_dob = client.dob.strftime('%m/%d/%Y') if client.dob else None
            page_number = dob_field.get('page_number', 1)
            
            if expected_dob and extracted_dob:
                if extracted_dob != expected_dob:
                    mismatch = Mismatch(
                        doc_id=doc_id,
                        field='dob',
                        expected_value=expected_dob,
                        observed_value=extracted_dob,
                        page_number=page_number
                    )
                    db.add(mismatch)
                    mismatches.append({
                        'field': 'dob',
                        'expected': expected_dob,
                        'observed': extracted_dob,
                        'page_number': page_number
                    })
        
        # Check DoA mismatch
        doa_field = extracted_fields.get('doa')
        if doa_field:
            extracted_doa = doa_field.get('normalized_value')
            # Convert expected date to MM/DD/YYYY format to match extracted format
            expected_doa = client.doa.strftime('%m/%d/%Y') if client.doa else None
            page_number = doa_field.get('page_number', 1)
            
            if expected_doa and extracted_doa:
                if extracted_doa != expected_doa:
                    mismatch = Mismatch(
                        doc_id=doc_id,
                        field='doa',
                        expected_value=expected_doa,
                        observed_value=extracted_doa,
                        page_number=page_number
                    )
                    db.add(mismatch)
                    mismatches.append({
                        'field': 'doa',
                        'expected': expected_doa,
                        'observed': extracted_doa,
                        'page_number': page_number
                    })
        
        db.commit()
        return mismatches

    def _normalize_name(self, name: str) -> str:
        """Normalize name for matching."""
        if not name:
            return ""
        # Convert to lowercase
        normalized = name.lower()
        # Remove punctuation
        normalized = re.sub(r'[^\w\s]', '', normalized)
        # Remove extra whitespace
        normalized = ' '.join(normalized.split())
        return normalized


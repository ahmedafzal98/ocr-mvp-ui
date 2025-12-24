"""
Service for extracting structured data from OCR results.
"""
import re
from datetime import datetime
from typing import Dict, Any, Optional, List
from dateutil import parser as date_parser


class ExtractionService:
    """Service for extracting structured fields from OCR text."""

    # Common date patterns
    DATE_PATTERNS = [
        r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # MM/DD/YYYY or MM-DD-YYYY
        r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',   # YYYY/MM/DD or YYYY-MM-DD
        r'\d{1,2}\s+\w{3,9}\s+\d{2,4}',   # DD Month YYYY
        r'\w{3,9}\s+\d{1,2},?\s+\d{2,4}', # Month DD, YYYY
    ]

    # Field keywords for extraction
    FIELD_KEYWORDS = {
        'name': ['patient name', 'name', 'patient', 'full name', 'client name'],
        'dob': ['date of birth', 'dob', 'birth date', 'born', 'birthday'],
        'doa': [
            'date of accident', 'doa', 'accident date', 
            'date of incident', 'incident date', 
            'date of instance', 'instance date',
            'date of collision', 'collision date',
            'collision occurred on', 'collision occurred',
            'onset date', 'date of onset'
        ],
        'referral': ['referral', 'referral date', 'referral number', 'ref', 'referral id'],
        'service_dates': [
            'service date', 'service dates', 'date of service', 'dos', 'treatment date',
            'date of appointment', 'appointment date',
            'date of visit', 'visit date', 'visiting date',
            'diagnosed date', 'date of diagnosis', 'diagnosis date'
        ]
    }

    def extract_fields(self, ocr_result: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """
        Extract structured fields from OCR result.
        Prioritizes Document AI entities, falls back to text pattern matching.
        
        Args:
            ocr_result: OCR result dictionary with 'full_text', 'entities', and optionally 'entity_pages'
            
        Returns:
            Dictionary of extracted fields with raw_value, normalized_value, confidence, and page_number
        """
        # Use print() for visibility in terminal
        full_text = ocr_result.get('full_text', '')
        entities = ocr_result.get('entities', {})
        entity_pages = ocr_result.get('entity_pages', {})  # Map of entity_type -> page_number
        
        print(f"🔍 Starting field extraction...")
        print(f"   Full text length: {len(full_text)}")
        print(f"   Entities from Document AI: {len(entities)}")
        print(f"   Entity pages map: {entity_pages}")
        # Log each entity's page number for debugging
        if entities:
            print(f"   Entity page numbers from entities dict:")
            for entity_type, entity_data in entities.items():
                page_num = entity_data.get('page_number', 'N/A')
                print(f"     - {entity_type}: page_number={page_num}")
        
        extracted = {}
        
        # PRIORITY 1: Extract from Document AI entities first (most reliable)
        if entities:
            print("📋 Extracting from Document AI entities...")
            
            # Key mapping from Document AI entity types to our field names
            key_map = {
                "name": "patient_name", "client name": "patient_name", "patient name": "patient_name",
                "person_name": "patient_name", "patient_name": "patient_name",
                # Date of Accident variations
                "doa": "doa", "date of accident": "doa", "date of injury": "doa", "accident_date": "doa",
                "date of incident": "doa", "incident date": "doa", "incident_date": "doa",
                "date of instance": "doa", "instance date": "doa", "instance_date": "doa",
                "date of collision": "doa", "collision date": "doa", "collision_date": "doa",
                "collision occurred on": "doa", "collision occurred": "doa",
                "onset date": "doa", "date of onset": "doa", "onset_date": "doa",
                # Date of Birth
                "dob": "dob", "date of birth": "dob", "birth date": "dob", "birth": "dob", "date_of_birth": "dob",
                # Date of Service/Appointment variations (distinct from Date of Accident)
                "service date": "service_dates", "service dates": "service_dates",
                "date of service": "service_dates", "service": "service_dates", "service_date": "service_dates",
                "date of appointment": "service_dates", "appointment date": "service_dates", "appointment_date": "service_dates",
                "date of visit": "service_dates", "visit date": "service_dates", "visiting date": "service_dates", "visit_date": "service_dates",
                "diagnosed date": "service_dates", "date of diagnosis": "service_dates", "diagnosis date": "service_dates", "diagnosis_date": "service_dates",
                # Referral
                "referral": "referral", "reason for visit": "referral", "referral details": "referral",
                "referral note": "referral", "instructions": "referral", "referral_number": "referral",
                "referral_id": "referral", "ref": "referral"
            }
            
            for entity_type, entity_data in entities.items():
                entity_type_lower = entity_type.lower()
                entity_value = entity_data.get('value', '')
                confidence = entity_data.get('confidence', 0.8)
                # Get page number from entity_pages map or entity_data, default to 1
                # Try entity_pages first (most reliable), then entity_data, then default to 1
                page_number = entity_pages.get(entity_type)
                if page_number is None:
                    page_number = entity_data.get('page_number')
                if page_number is None:
                    page_number = 1
                    print(f"   ⚠️  Page number not found for '{entity_type}', defaulting to 1. entity_pages={entity_pages.get(entity_type)}, entity_data.page_number={entity_data.get('page_number')}")
                else:
                    print(f"   ✅ Page number lookup for '{entity_type}': entity_pages={entity_pages.get(entity_type)}, entity_data.page_number={entity_data.get('page_number')}, final={page_number}")
                
                # Map entity type to our field name
                if entity_type_lower in key_map:
                    mapped_key = key_map[entity_type_lower]
                    
                    # Handle service_dates as list (multiple dates possible)
                    if mapped_key == "service_dates":
                        if mapped_key not in extracted:
                            extracted[mapped_key] = {
                                'raw_value': [],
                                'normalized_value': [],
                                'confidence': confidence,
                                'page_number': page_number
                            }
                        extracted[mapped_key]['raw_value'].append(entity_value)
                        normalized_date = self._normalize_date(entity_value)
                        if normalized_date:
                            extracted[mapped_key]['normalized_value'].append(normalized_date)
                    else:
                        # For other fields, use the one with highest confidence
                        # IMPORTANT: When updating, preserve the page_number from the entity with higher confidence
                        if mapped_key not in extracted or extracted[mapped_key].get('confidence', 0) < confidence:
                            extracted[mapped_key] = {
                                'raw_value': entity_value,
                                'normalized_value': self._normalize_field_value(mapped_key, entity_value),
                                'confidence': confidence,
                                'page_number': page_number  # Include page number from this entity
                            }
                            print(f"   ✅ {mapped_key} from entity '{entity_type}': {entity_value} (confidence: {confidence:.2f}, page: {page_number})")
                        else:
                            # Log when we skip due to lower confidence
                            existing_page = extracted[mapped_key].get('page_number', 'N/A')
                            existing_confidence = extracted[mapped_key].get('confidence', 0)
                            print(f"   ⏭️  Skipped {mapped_key} from entity '{entity_type}' (lower confidence: {confidence:.2f} < {existing_confidence:.2f}), keeping page: {existing_page}")
                else:
                    print(f"   ⚠️  Unmapped entity type: {entity_type} = {entity_value[:50]}")
            
            # Convert service_dates list to string for storage
            if "service_dates" in extracted and isinstance(extracted["service_dates"]["raw_value"], list):
                extracted["service_dates"]["raw_value"] = "; ".join(extracted["service_dates"]["raw_value"])
                extracted["service_dates"]["normalized_value"] = "; ".join(extracted["service_dates"]["normalized_value"])
        
        # PRIORITY 2: Fallback to text pattern extraction for missing fields
        print("📝 Checking for missing fields using text patterns...")
        
        if 'patient_name' not in extracted:
            name_data = self._extract_name(full_text, {})
            if name_data:
                name_data['page_number'] = 1  # Default to page 1 if extracted from text
                extracted['patient_name'] = name_data
                print(f"   ✅ patient_name from text: {name_data.get('raw_value')}")
        
        if 'dob' not in extracted:
            dob_data = self._extract_dob(full_text, {})
            if dob_data:
                dob_data['page_number'] = 1  # Default to page 1 if extracted from text
                extracted['dob'] = dob_data
                print(f"   ✅ dob from text: {dob_data.get('raw_value')}")
        
        if 'doa' not in extracted:
            doa_data = self._extract_doa(full_text, {})
            if doa_data:
                doa_data['page_number'] = 1  # Default to page 1 if extracted from text
                extracted['doa'] = doa_data
                print(f"   ✅ doa from text: {doa_data.get('raw_value')}")
        
        if 'referral' not in extracted:
            referral_data = self._extract_referral(full_text, {})
            if referral_data:
                referral_data['page_number'] = 1  # Default to page 1 if extracted from text
                extracted['referral'] = referral_data
                print(f"   ✅ referral from text: {referral_data.get('raw_value')}")
        
        # Log summary
        print(f"✅ Extraction complete. Found {len(extracted)} fields")
        for field_name, field_data in extracted.items():
            raw_val = field_data.get('raw_value', 'N/A')
            if isinstance(raw_val, list):
                raw_val = '; '.join(raw_val)
            page_num = field_data.get('page_number', 'N/A')
            print(f"   ✅ {field_name}: {raw_val} (confidence: {field_data.get('confidence', 0):.2f}, page: {page_num})")
        
        return extracted
    
    def _normalize_field_value(self, field_name: str, value: str) -> str:
        """Normalize field value based on field type."""
        if field_name in ['dob', 'doa']:
            return self._normalize_date(value) or value
        elif field_name == 'patient_name':
            return self._normalize_name(value)
        elif field_name == 'referral':
            return value.strip().upper()
        else:
            return value.strip()

    def _extract_name(self, text: str, entities: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract patient name from text."""
        # Try entity extraction first (if entities passed)
        if entities:
            name_entities = ['person_name', 'name', 'patient_name']
            for entity_type in name_entities:
                if entity_type in entities:
                    entity = entities[entity_type]
                    return {
                        'raw_value': entity['value'],
                        'normalized_value': self._normalize_name(entity['value']),
                        'confidence': entity.get('confidence', 0.8)
                    }
        
        # Fallback: search for name patterns near keywords
        # Improved patterns based on old code
        text_lower = text.lower()
        
        # Pattern 1: Look for "patient name:", "name:", etc. followed by capitalized name
        name_patterns = [
            r'(?:patient|client|name)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'name[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Validate it's a real name (not a date, exam type, etc.)
                if (len(name.split()) >= 2 and  # At least 2 words
                    not re.search(r'\d', name) and  # No numbers
                    not any(word in name.lower() for word in ['exam', 'date', 'detailed', 'initial', 'follow'])):
                    return {
                        'raw_value': name,
                        'normalized_value': self._normalize_name(name),
                        'confidence': 0.6
                    }
        
        # Pattern 2: Look near keywords
        for keyword in self.FIELD_KEYWORDS['name']:
            pattern = re.compile(re.escape(keyword) + r'[:,\-\s]+', re.IGNORECASE)
            for match in pattern.finditer(text):
                idx = match.end()
                # Extract text after keyword (next 60 chars, stop at newline or next field)
                snippet = text[idx:idx+60]
                # Stop at newline or next field keyword
                snippet = re.split(r'[\n\r]|Date of|Referral|Service|Exam|Bill', snippet)[0]
                snippet = snippet.strip()
                # Remove common separators
                snippet = re.sub(r'^[:,\-\s]+', '', snippet)
                # Look for capitalized words (likely name) - 2-4 words
                name_match = re.search(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b', snippet)
                if name_match:
                    name = name_match.group(1).strip()
                    # Validate it's a real name
                    if (len(name.split()) >= 2 and
                        not re.search(r'\d', name) and
                        not any(word in name.lower() for word in ['exam', 'date', 'detailed', 'initial', 'follow', 'visit'])):
                        return {
                            'raw_value': name,
                            'normalized_value': self._normalize_name(name),
                            'confidence': 0.5
                        }
        
        return None

    def _extract_dob(self, text: str, entities: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract date of birth from text."""
        # Try entity extraction first
        dob_entities = ['date_of_birth', 'dob', 'birth_date']
        for entity_type in dob_entities:
            if entity_type in entities:
                entity = entities[entity_type]
                normalized = self._normalize_date(entity['value'])
                return {
                    'raw_value': entity['value'],
                    'normalized_value': normalized,
                    'confidence': entity.get('confidence', 0.8)
                }
        
        # Fallback: search for dates near DOB keywords
        return self._extract_date_near_keyword(text, self.FIELD_KEYWORDS['dob'], 'dob')

    def _extract_doa(self, text: str, entities: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract date of accident from text."""
        # Try entity extraction first
        doa_entities = [
            'date_of_accident', 'doa', 'accident_date', 
            'incident_date', 'date_of_incident',
            'instance_date', 'date_of_instance',
            'collision_date', 'date_of_collision',
            'onset_date', 'date_of_onset'
        ]
        for entity_type in doa_entities:
            if entity_type in entities:
                entity = entities[entity_type]
                normalized = self._normalize_date(entity['value'])
                return {
                    'raw_value': entity['value'],
                    'normalized_value': normalized,
                    'confidence': entity.get('confidence', 0.8)
                }
        
        # Fallback: search for dates near DOA keywords (prioritize accident-related keywords)
        # Make sure we don't confuse with service/appointment dates
        return self._extract_date_near_keyword(text, self.FIELD_KEYWORDS['doa'], 'doa', exclude_keywords=self.FIELD_KEYWORDS['service_dates'])

    def _extract_referral(self, text: str, entities: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract referral information from text."""
        # Try entity extraction first
        referral_entities = ['referral', 'referral_number', 'referral_id', 'ref']
        for entity_type in referral_entities:
            if entity_type in entities:
                entity = entities[entity_type]
                return {
                    'raw_value': entity['value'],
                    'normalized_value': entity['value'].strip().upper(),
                    'confidence': entity.get('confidence', 0.8)
                }
        
        # Fallback: search for referral near keywords
        for keyword in self.FIELD_KEYWORDS['referral']:
            # Find keyword with case-insensitive search, including "number" or "id" after it
            pattern = re.compile(re.escape(keyword) + r'(?:\s+(?:number|id|#))?[:,\-\s]*', re.IGNORECASE)
            for match in pattern.finditer(text):
                idx = match.end()
                # Extract text after keyword (next 50 chars, stop at newline)
                snippet = text[idx:idx+50]
                # Stop at newline or next field keyword
                snippet = re.split(r'[\n\r]|Date of|Service|Patient', snippet)[0]
                snippet = snippet.strip()
                # Remove common separators
                snippet = re.sub(r'^[:,\-\s]+', '', snippet)
                # Look for alphanumeric patterns (referral numbers/IDs)
                # Pattern: starts with letters, may have numbers/dashes, 3-20 chars
                referral_match = re.search(r'\b([A-Z]{2,}[0-9A-Z\-]{1,18}|[A-Z0-9\-]{3,20})\b', snippet, re.IGNORECASE)
                if referral_match:
                    referral = referral_match.group(1).strip()
                    # Don't include common words
                    if (referral.lower() not in ['number', 'id', 'ref', 'referral'] and
                        len(referral) >= 3):
                        return {
                            'raw_value': referral,
                            'normalized_value': referral.upper(),
                            'confidence': 0.6
                        }
        
        return None

    def _extract_service_dates(self, text: str, entities: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract service/appointment dates from text (distinct from accident dates)."""
        # Try entity extraction first
        service_entities = [
            'service_date', 'date_of_service', 'dos',
            'appointment_date', 'date_of_appointment',
            'visit_date', 'date_of_visit', 'visiting_date',
            'diagnosis_date', 'date_of_diagnosis', 'diagnosed_date'
        ]
        for entity_type in service_entities:
            if entity_type in entities:
                entity = entities[entity_type]
                normalized = self._normalize_date(entity['value'])
                return {
                    'raw_value': entity['value'],
                    'normalized_value': normalized,
                    'confidence': entity.get('confidence', 0.8)
                }
        
        # Fallback: find all dates that might be service/appointment dates
        # Make sure we don't confuse with accident dates
        dates = self._find_all_dates(text)
        if dates:
            # Filter dates that are near service/appointment keywords (not accident keywords)
            service_dates = []
            text_lower = text.lower()
            accident_keywords = [kw.lower() for kw in self.FIELD_KEYWORDS['doa']]
            
            for keyword in self.FIELD_KEYWORDS['service_dates']:
                keyword_lower = keyword.lower()
                # Skip if this looks like an accident keyword
                if any(acc_kw in keyword_lower for acc_kw in ['accident', 'incident', 'collision', 'onset']):
                    continue
                    
                idx = text_lower.find(keyword_lower)
                if idx != -1:
                    # Check if accident keyword appears nearby (within 50 chars) - if so, skip
                    nearby_text = text_lower[max(0, idx-50):idx+100]
                    if any(acc_kw in nearby_text for acc_kw in accident_keywords):
                        continue
                    
                    # Find dates within 100 chars of keyword
                    for date_str, date_obj in dates:
                        if abs(text.find(date_str) - idx) < 100:
                            service_dates.append(date_str)
            
            if service_dates:
                combined = ', '.join(service_dates)
                return {
                    'raw_value': combined,
                    'normalized_value': combined,
                    'confidence': 0.6
                }
        
        return None

    def _extract_date_near_keyword(
        self, 
        text: str, 
        keywords: List[str], 
        field_type: str,
        exclude_keywords: List[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Extract date near a keyword, avoiding confusion with excluded keywords."""
        exclude_keywords = exclude_keywords or []
        
        for keyword in keywords:
            # Skip if this keyword is in exclude list (to avoid confusion)
            if keyword.lower() in [k.lower() for k in exclude_keywords]:
                continue
                
            # Find keyword with case-insensitive search, including "date" after it
            pattern = re.compile(re.escape(keyword) + r'(?:\s+date)?[:,\-\s]*', re.IGNORECASE)
            for match in pattern.finditer(text):
                idx = match.end()
                # Extract text after keyword (next 50 chars, stop at newline)
                snippet = text[idx:idx+50]
                # Stop at newline or next field keyword (including excluded keywords)
                stop_pattern = r'[\n\r]|Date of|Referral|Service|Patient'
                for excl_kw in exclude_keywords:
                    stop_pattern += f'|{re.escape(excl_kw)}'
                snippet = re.split(stop_pattern, snippet, flags=re.IGNORECASE)[0]
                snippet = snippet.strip()
                # Remove common separators
                snippet = re.sub(r'^[:,\-\s]+', '', snippet)
                # Look for date in the snippet (first 30 chars to avoid getting wrong dates)
                date_match = self._find_first_date(snippet[:30])
                if date_match:
                    normalized = self._normalize_date(date_match)
                    return {
                        'raw_value': date_match,
                        'normalized_value': normalized,
                        'confidence': 0.6
                    }
        return None

    def _find_first_date(self, text: str) -> Optional[str]:
        """Find first date in text."""
        # Clean text - remove extra whitespace
        text = ' '.join(text.split())
        for pattern in self.DATE_PATTERNS:
            match = re.search(pattern, text)
            if match:
                date_str = match.group(0).strip()
                # Validate it's actually a date (not just numbers)
                if len(date_str) >= 6:  # At least MM/DD/YY
                    return date_str
        return None

    def _find_all_dates(self, text: str) -> List[tuple]:
        """Find all dates in text."""
        dates = []
        for pattern in self.DATE_PATTERNS:
            for match in re.finditer(pattern, text):
                date_str = match.group(0)
                try:
                    date_obj = date_parser.parse(date_str, fuzzy=True)
                    dates.append((date_str, date_obj))
                except:
                    pass
        return dates

    def _normalize_name(self, name: str) -> str:
        """Normalize name for matching (lowercase, remove punctuation)."""
        if not name:
            return ""
        # Convert to lowercase
        normalized = name.lower()
        # Remove punctuation
        normalized = re.sub(r'[^\w\s]', '', normalized)
        # Remove extra whitespace
        normalized = ' '.join(normalized.split())
        return normalized

    def _normalize_date(self, date_str: str) -> Optional[str]:
        """
        Normalize date string to MM/DD/YYYY format.
        
        Args:
            date_str: Date string in various formats
            
        Returns:
            Normalized date string in MM/DD/YYYY format or None if parsing fails
        """
        if not date_str:
            return None
        
        try:
            # Try to parse the date
            date_obj = date_parser.parse(date_str, fuzzy=True)
            # Return in MM/DD/YYYY format
            return date_obj.strftime('%m/%d/%Y')
        except:
            # If parsing fails, return original string
            return date_str


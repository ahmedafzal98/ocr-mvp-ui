# Date Extraction Improvements

## Summary of Changes

This document describes the improvements made to handle various date field variations and provide better mismatch reporting with page numbers.

---

## ✅ Changes Implemented

### 1. Enhanced Date of Accident Recognition

**Added support for multiple variations:**
- Date of Accident
- Date of Incident
- Date of Instance
- Date of Collision
- Collision Occurred on
- Collision Occurred
- Onset Date
- Date of Onset

**Files Modified:**
- `backend/services/extraction_service.py` - Added keywords to `FIELD_KEYWORDS['doa']`
- `backend/services/extraction_service.py` - Updated `key_map` in `extract_fields()` method
- `backend/services/extraction_service.py` - Updated `_extract_doa()` method

---

### 2. Enhanced Date of Appointment/Service Recognition

**Added support for multiple variations:**
- Date of Service
- Date of Appointment
- Date of Visit
- Visiting Date
- Diagnosed Date
- Date of Diagnosis
- Diagnosis Date

**Files Modified:**
- `backend/services/extraction_service.py` - Added keywords to `FIELD_KEYWORDS['service_dates']`
- `backend/services/extraction_service.py` - Updated `key_map` in `extract_fields()` method
- `backend/services/extraction_service.py` - Updated `_extract_service_dates()` method

---

### 3. Distinction Between Date of Accident and Date of Appointment

**Implementation:**
- Added logic to prevent confusion between accident dates and appointment/service dates
- `_extract_doa()` now excludes service/appointment keywords
- `_extract_service_dates()` checks for nearby accident keywords and skips if found
- `_extract_date_near_keyword()` accepts `exclude_keywords` parameter to avoid false matches

**Files Modified:**
- `backend/services/extraction_service.py` - Updated `_extract_doa()` to exclude service keywords
- `backend/services/extraction_service.py` - Updated `_extract_service_dates()` to check for accident keywords
- `backend/services/extraction_service.py` - Updated `_extract_date_near_keyword()` to accept exclude_keywords

---

### 4. Date Format Changed to MM/DD/YYYY

**Before:** Dates were normalized to `YYYY-MM-DD` format (e.g., `2024-01-15`)

**After:** Dates are normalized to `MM/DD/YYYY` format (e.g., `01/15/2024`)

**Files Modified:**
- `backend/services/extraction_service.py` - Updated `_normalize_date()` method
- `backend/services/matching_service.py` - Updated date comparison to use MM/DD/YYYY format
- `backend/routes/matches.py` - Updated date formatting to MM/DD/YYYY

---

### 5. Page Number Tracking

**Database Changes:**
- Added `page_number` column to `extracted_fields` table
- Added `page_number` column to `mismatches` table

**Implementation:**
- OCR service extracts page numbers from Document AI entities using `page_anchor.page_refs`
- Extraction service includes page numbers in extracted field data
- Matching service saves page numbers when creating mismatch records
- API responses include page numbers for mismatches

**Files Modified:**
- `backend/database/models.py` - Added `page_number` to `ExtractedField` and `Mismatch` models
- `backend/services/ocr_service.py` - Extract page numbers from Document AI entities
- `backend/services/extraction_service.py` - Include page numbers in extracted fields
- `backend/services/matching_service.py` - Save page numbers in mismatch records
- `backend/routes/documents.py` - Save page numbers when storing extracted fields
- `backend/routes/matches.py` - Include page numbers in API responses

---

## 📋 Database Migration Required

**⚠️ IMPORTANT:** You need to add the `page_number` columns to your database.

### Option 1: Using Alembic (Recommended)

Create a migration:
```bash
cd backend
alembic revision -m "add_page_number_to_extracted_fields_and_mismatches"
```

Then edit the migration file to add:
```python
def upgrade():
    op.add_column('extracted_fields', sa.Column('page_number', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('mismatches', sa.Column('page_number', sa.Integer(), nullable=True, server_default='1'))

def downgrade():
    op.drop_column('mismatches', 'page_number')
    op.drop_column('extracted_fields', 'page_number')
```

Run migration:
```bash
alembic upgrade head
```

### Option 2: Direct SQL

```sql
ALTER TABLE extracted_fields ADD COLUMN page_number INTEGER DEFAULT 1;
ALTER TABLE mismatches ADD COLUMN page_number INTEGER DEFAULT 1;
```

---

## 🔍 How It Works

### Date Extraction Flow

1. **Document AI Processing:**
   - OCR service processes document and extracts entities
   - Page numbers are extracted from `entity.page_anchor.page_refs`
   - Entities include page number information

2. **Field Extraction:**
   - Extraction service maps entity types to field names
   - Date of Accident variations → `doa` field
   - Date of Appointment/Service variations → `service_dates` field
   - Dates are normalized to MM/DD/YYYY format
   - Page numbers are included in extracted field data

3. **Mismatch Detection:**
   - Matching service compares extracted dates with client profile dates
   - If mismatch found, creates Mismatch record with page number
   - Page number indicates where in document the mismatch was found

4. **API Response:**
   - `/matches/{doc_id}` endpoint returns mismatch details
   - Each mismatch includes:
     - Field name (dob/doa)
     - Expected value
     - Observed value
     - **Page number** (NEW)

---

## 📊 Example API Response

**Before:**
```json
{
  "mismatches": [
    {
      "field": "doa",
      "expected_value": "2024-01-15",
      "observed_value": "2024-01-20"
    }
  ]
}
```

**After:**
```json
{
  "mismatches": [
    {
      "field": "doa",
      "expected_value": "01/15/2024",
      "observed_value": "01/20/2024",
      "page_number": 2
    }
  ],
  "field_matches": {
    "doa": {
      "display_name": "Date of Accident",
      "extracted_value": "01/20/2024",
      "expected_value": "01/15/2024",
      "match_status": "mismatch",
      "is_match": false,
      "confidence": 0.95,
      "page_number": 2
    }
  }
}
```

---

## 🧪 Testing

### Test Cases to Verify

1. **Date of Accident Variations:**
   - Upload document with "Date of Incident: 01/15/2024"
   - Upload document with "Collision Occurred on: 02/20/2024"
   - Upload document with "Onset Date: 03/10/2024"
   - Verify all are extracted as `doa` field

2. **Date of Appointment Variations:**
   - Upload document with "Date of Appointment: 04/05/2024"
   - Upload document with "Date of Visit: 05/15/2024"
   - Upload document with "Diagnosed Date: 06/20/2024"
   - Verify all are extracted as `service_dates` field

3. **Distinction Test:**
   - Upload document with both "Date of Accident" and "Date of Appointment"
   - Verify they are extracted as separate fields (doa vs service_dates)
   - Verify no confusion between the two

4. **Page Number Test:**
   - Upload multi-page document
   - Verify page numbers are correctly extracted
   - Verify mismatch reports include correct page numbers

5. **Date Format Test:**
   - Upload document with date in various formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
   - Verify all dates are normalized to MM/DD/YYYY format
   - Verify mismatch comparison uses MM/DD/YYYY format

---

## 🚀 Deployment Notes

1. **Database Migration:**
   - Run migration to add `page_number` columns
   - Existing records will have `page_number = 1` (default)

2. **No Breaking Changes:**
   - API responses are backward compatible
   - New fields are added, not removed
   - Existing functionality continues to work

3. **Performance:**
   - Page number extraction adds minimal overhead
   - No significant performance impact

---

## 📝 Notes

- Page numbers default to 1 if not available from Document AI
- Date format change applies to all date fields (dob, doa, service_dates)
- The distinction between accident dates and appointment dates is based on keyword proximity and exclusion logic
- If a document has both accident and appointment dates, both will be extracted correctly

---

## 🔗 Related Files

- `backend/services/extraction_service.py` - Main extraction logic
- `backend/services/ocr_service.py` - OCR and page number extraction
- `backend/services/matching_service.py` - Mismatch detection
- `backend/database/models.py` - Database schema
- `backend/routes/documents.py` - Document processing
- `backend/routes/matches.py` - Match/mismatch API endpoints

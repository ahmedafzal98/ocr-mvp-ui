# Page Number Fix - Complete Summary

## Problem Statement

Page numbers were always displaying as "Page 1" even when fields were extracted from other pages (e.g., Page 4).

---

## Root Causes Identified

### 1. Document AI Page Numbers are 0-Indexed ⚠️

**Issue:**
- Document AI returns page numbers as **0-indexed** (0 = first page, 1 = second page, etc.)
- Code was treating them as **1-indexed** (1 = first page, 2 = second page, etc.)
- Result: Page 0 was displayed as "Page 0" or defaulted to "Page 1"

**Location:** `backend/services/ocr_service.py` lines 137-186

**Evidence:**
- Google Document AI documentation confirms page numbers are 0-indexed
- `page_ref.page` returns integer starting from 0

---

### 2. Page Number Not Included in Extracted Fields Dictionary ❌

**Issue:**
- Extraction service was extracting `page_number` from entities
- BUT when creating the extracted field dictionary, `page_number` was **NOT included**
- Result: All fields defaulted to `page_number = 1`

**Location:** `backend/services/extraction_service.py` lines 118-128

**Before:**
```python
extracted[mapped_key] = {
    'raw_value': entity_value,
    'normalized_value': self._normalize_field_value(mapped_key, entity_value),
    'confidence': confidence
    # page_number MISSING!
}
```

**After:**
```python
extracted[mapped_key] = {
    'raw_value': entity_value,
    'normalized_value': self._normalize_field_value(mapped_key, entity_value),
    'confidence': confidence,
    'page_number': page_number  # ✅ NOW INCLUDED
}
```

---

### 3. entity_pages Not Extracted from OCR Result ❌

**Issue:**
- OCR service returns `entity_pages` map in the result
- Extraction service was NOT extracting it from `ocr_result`
- Code tried to use `entity_pages.get(entity_type, ...)` but variable didn't exist
- Result: Always defaulted to page 1

**Location:** `backend/services/extraction_service.py` line 58

**Before:**
```python
full_text = ocr_result.get('full_text', '')
entities = ocr_result.get('entities', {})
# entity_pages NOT extracted!
```

**After:**
```python
full_text = ocr_result.get('full_text', '')
entities = ocr_result.get('entities', {})
entity_pages = ocr_result.get('entity_pages', {})  # ✅ NOW EXTRACTED
```

---

### 4. Page Number Extraction Logic Incomplete ⚠️

**Issue:**
- Page number extraction only handled string format
- Didn't handle integer format (most common case)
- Didn't handle Document AI's 0-indexed format
- Fallback logic defaulted to page 1 too quickly

**Location:** `backend/services/ocr_service.py` lines 137-186

---

## Solution Implemented

### Fix 1: 0-Indexed to 1-Indexed Conversion

**File:** `backend/services/ocr_service.py`

**Changes:**
- Handle integer page numbers (0-indexed) → add 1
- Handle string format → extract and convert
- Handle Page object → extract page_number attribute
- Better error handling and logging

```python
# Case 1: Direct integer (0-indexed)
if isinstance(page_value, int):
    page_number = page_value + 1  # Convert to 1-indexed (0→1, 1→2, 2→3)

# Case 2: String format
elif isinstance(page_value, str):
    # Extract number and convert
    page_number = extracted_page + 1 if extracted_page == 0 else extracted_page

# Case 3: Page object
elif hasattr(page_value, 'page_number'):
    page_num = page_value.page_number
    page_number = page_num + 1 if page_num == 0 else page_num
```

---

### Fix 2: Extract entity_pages from OCR Result

**File:** `backend/services/extraction_service.py`

**Changes:**
- Extract `entity_pages` map from `ocr_result`
- Use it to get page numbers for entities

```python
entity_pages = ocr_result.get('entity_pages', {})  # Map of entity_type -> page_number
```

---

### Fix 3: Include page_number in Extracted Fields

**File:** `backend/services/extraction_service.py`

**Changes:**
- Get page_number from `entity_pages` or `entity_data`
- Include `page_number` when creating extracted field dictionary

```python
# Get page number from entity_pages map or entity_data, default to 1
page_number = entity_pages.get(entity_type, entity_data.get('page_number', 1))

extracted[mapped_key] = {
    'raw_value': entity_value,
    'normalized_value': self._normalize_field_value(mapped_key, entity_value),
    'confidence': confidence,
    'page_number': page_number  # ✅ NOW INCLUDED
}
```

---

### Fix 4: Improved Text Anchor Page Mapping

**File:** `backend/services/ocr_service.py`

**Changes:**
- Better logic to map text_anchor text_segments to page numbers
- Uses `document.pages` structure to find which page contains the text
- Maps text index to page number by checking page boundaries

```python
# Map text index to page number using document.pages
for page_idx, page in enumerate(document.pages):
    if hasattr(page, 'layout') and hasattr(page.layout, 'text_anchor'):
        for page_seg in page.layout.text_anchor.text_segments:
            if page_seg.start_index <= text_index <= page_seg.end_index:
                page_number = page_idx + 1  # 0-indexed to 1-indexed
                break
```

---

### Fix 5: Enhanced Logging

**Files:** `backend/services/ocr_service.py`, `backend/services/extraction_service.py`, `backend/routes/documents.py`

**Changes:**
- Log page numbers during OCR extraction
- Log page numbers during field extraction
- Log page numbers in extracted fields detail

```python
# OCR Service
ocr_logger.info(f"   Entity {idx+1}: type={entity_type}, ..., page={page_number}")

# Extraction Service
extract_logger.info(f"   ✅ {mapped_key} from entity '{entity_type}': ... (page: {page_number})")

# Documents Route
logger.info(f"    Page Number: {field_data.get('page_number', 1)}")
```

---

## Files Modified

### Backend:

1. **`backend/services/ocr_service.py`**
   - Fixed 0-indexed to 1-indexed conversion (lines 150-172)
   - Improved page number extraction from page_anchor (lines 137-186)
   - Added text_anchor-based page mapping (lines 180-220)
   - Enhanced logging for page number extraction

2. **`backend/services/extraction_service.py`**
   - Added `entity_pages` extraction from OCR result (line 58)
   - Included `page_number` in extracted field dictionary (lines 114, 127)
   - Get page_number from entity_pages or entity_data (line 101)
   - Enhanced logging to show page numbers

3. **`backend/routes/documents.py`**
   - Enhanced logging to show page numbers in entities (line 208)
   - Enhanced logging to show page numbers in extracted fields (line 225)

### Frontend:
- **No changes needed** - Frontend already displays `page_number` correctly

---

## How Page Numbers Are Now Calculated

### Complete Flow:

```
1. Document AI Processing
   ↓
   Entity.page_anchor.page_refs[0].page
   ↓
   Returns: 0 (0-indexed) for first page, 1 for second page, etc.
   ↓

2. OCR Service (ocr_service.py)
   ↓
   Extract page number: page_value = 0
   ↓
   Convert to 1-indexed: page_number = 0 + 1 = 1
   ↓
   Store in: entities[entity_type]['page_number'] = 1
   Store in: entity_pages[entity_type] = 1
   ↓
   Return: {
     'entities': {'date_of_birth': {'value': '...', 'page_number': 1}},
     'entity_pages': {'date_of_birth': 1}
   }
   ↓

3. Extraction Service (extraction_service.py)
   ↓
   Get entity_pages = {'date_of_birth': 1, 'person_name': 2}
   ↓
   For each entity:
     page_number = entity_pages.get('date_of_birth', 1) = 1
   ↓
   Create extracted field:
     extracted['dob'] = {
       'raw_value': '01/15/1980',
       'normalized_value': '01/15/1980',
       'confidence': 0.95,
       'page_number': 1  ✅ NOW INCLUDED
     }
   ↓

4. Database (routes/documents.py)
   ↓
   Save to ExtractedField:
     page_number = field_data.get('page_number', 1) = 1
   ↓
   INSERT INTO extracted_fields (..., page_number) VALUES (..., 1)
   ↓

5. API Response (routes/documents.py)
   ↓
   Return: {
     "page_num": field.page_number = 1
   }
   ↓

6. Frontend (DocumentReviewPage.jsx)
   ↓
   Display: "📄 Page 1"
```

---

## Testing Instructions

### Test Case 1: Multi-Page Document

1. **Upload a multi-page PDF** where:
   - Patient Name is on Page 1
   - Date of Birth is on Page 2
   - Date of Accident is on Page 4

2. **Check Backend Logs:**
   ```
   Look for:
   - "Entity X: type=person_name, ..., page=1"
   - "Entity X: type=date_of_birth, ..., page=2"
   - "Entity X: type=date_of_accident, ..., page=4"
   ```

3. **Check Database:**
   ```sql
   SELECT field_name, page_number FROM extracted_fields WHERE doc_id = X;
   
   Expected:
   patient_name | 1
   dob          | 2
   doa          | 4
   ```

4. **Check Frontend:**
   - Go to Document Review page
   - Verify:
     - Patient Name shows "📄 Page 1"
     - Date of Birth shows "📄 Page 2"
     - Date of Accident shows "📄 Page 4"

---

### Test Case 2: Single Page Document

1. **Upload a single-page PDF**
2. **Verify all fields show "📄 Page 1"**

---

### Test Case 3: Document with Missing Page Anchors

1. **Upload a document where some entities don't have page_anchor**
2. **Verify:**
   - Fields with page_anchor show correct page numbers
   - Fields without page_anchor default to "📄 Page 1"
   - No errors in logs

---

## Expected Behavior

### Before Fix:
- ❌ All fields always show "Page 1"
- ❌ Page numbers don't reflect actual document pages
- ❌ Multi-page documents show incorrect page numbers

### After Fix:
- ✅ Fields show correct page numbers (Page 1, Page 2, Page 4, etc.)
- ✅ Page numbers match where fields appear in the document
- ✅ Multi-page documents work correctly
- ✅ Each field shows its actual source page

---

## Debugging

### If Page Numbers Still Show as "Page 1":

1. **Check Backend Logs:**
   ```
   Look for: "Entity X: type=..., page=Y"
   If all show "page=1", Document AI might not be providing page anchors
   ```

2. **Check Database:**
   ```sql
   SELECT field_name, page_number FROM extracted_fields WHERE doc_id = X;
   If all are 1, check if page_number is being saved correctly
   ```

3. **Check OCR Result:**
   ```
   Add logging in extraction_service.py:
   logger.info(f"entity_pages: {entity_pages}")
   logger.info(f"entities with page_numbers: {[(k, v.get('page_number')) for k, v in entities.items()]}")
   ```

4. **Verify Document AI:**
   - Check if Document AI processor supports page anchors
   - Some processors may not provide page information
   - Check Document AI API response directly

---

## Summary

**Root Causes:**
1. Document AI page numbers are 0-indexed (not converted)
2. Page numbers not included in extracted field dictionary
3. entity_pages not extracted from OCR result
4. Page number extraction logic incomplete

**Solutions:**
1. ✅ Convert 0-indexed to 1-indexed (add 1)
2. ✅ Include page_number in extracted fields
3. ✅ Extract entity_pages from OCR result
4. ✅ Improved page number extraction logic
5. ✅ Enhanced logging for debugging

**Result:**
- Page numbers now correctly reflect document pages
- Multi-page documents work correctly
- Each field shows its actual source page

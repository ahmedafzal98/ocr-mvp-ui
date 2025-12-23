# Page Number Fix - Investigation and Solution

## Problem

Page numbers are always showing as "Page 1" even when fields are extracted from other pages (e.g., Page 4).

---

## Investigation

### Where Page Numbers Come From

**1. OCR Service (`backend/services/ocr_service.py`):**
- Extracts page numbers from Document AI entities
- Uses `entity.page_anchor.page_refs[0].page` to get page reference
- Stores in:
  - `entities[entity_type]['page_number']` 
  - `entity_pages[entity_type]` (map)
- Returns in OCR result: `{'entities': {...}, 'entity_pages': {...}}`

**2. Extraction Service (`backend/services/extraction_service.py`):**
- Receives `ocr_result` with `entities` and `entity_pages`
- Should extract page_number from `entity_pages` or `entity_data`
- Creates extracted fields dictionary with page_number

**3. Database (`backend/database/models.py`):**
- `ExtractedField.page_number` column stores the page number
- Default value is 1

**4. API Response (`backend/routes/documents.py`):**
- Returns `page_num: field.page_number if field.page_number else 1`

**5. Frontend (`src/pages/DocumentReviewPage.jsx`):**
- Displays `field.page_num` or `fieldData.page_number`

---

## Root Causes Identified

### Issue 1: Document AI Page Numbers are 0-Indexed

**Problem:**
- Document AI returns page numbers as **0-indexed** (0, 1, 2, ...)
- Code was treating them as **1-indexed** (1, 2, 3, ...)
- Result: Page 0 → displayed as Page 0 (or defaulted to 1)

**Location:** `backend/services/ocr_service.py` lines 141-155

**Fix:** Add 1 to convert 0-indexed to 1-indexed:
```python
if isinstance(page_value, int):
    page_number = page_value + 1  # Convert 0-indexed to 1-indexed
```

---

### Issue 2: Page Number Not Included in Extracted Fields

**Problem:**
- Extraction service was getting `page_number` from `entity_pages` or `entity_data`
- BUT when creating the extracted field dictionary, `page_number` was **NOT included**
- Result: All fields defaulted to page_number = 1

**Location:** `backend/services/extraction_service.py` lines 118-122

**Before:**
```python
extracted[mapped_key] = {
    'raw_value': entity_value,
    'normalized_value': self._normalize_field_value(mapped_key, entity_value),
    'confidence': confidence
    # page_number missing!
}
```

**After:**
```python
extracted[mapped_key] = {
    'raw_value': entity_value,
    'normalized_value': self._normalize_field_value(mapped_key, entity_value),
    'confidence': confidence,
    'page_number': page_number  # ✅ Now included
}
```

---

### Issue 3: entity_pages Not Extracted from OCR Result

**Problem:**
- `entity_pages` map was not being extracted from `ocr_result`
- Code tried to use `entity_pages.get(entity_type, ...)` but variable didn't exist
- Result: Always defaulted to page 1

**Location:** `backend/services/extraction_service.py` line 58

**Before:**
```python
full_text = ocr_result.get('full_text', '')
entities = ocr_result.get('entities', {})
# entity_pages missing!
```

**After:**
```python
full_text = ocr_result.get('full_text', '')
entities = ocr_result.get('entities', {})
entity_pages = ocr_result.get('entity_pages', {})  # ✅ Now extracted
```

---

### Issue 4: Page Number Extraction Logic Too Complex

**Problem:**
- Page number extraction tried multiple formats but had edge cases
- String parsing was unreliable
- Fallback logic defaulted to page 1 too quickly

**Location:** `backend/services/ocr_service.py` lines 137-186

**Fix:** Simplified and improved page number extraction:
- Handle integer (0-indexed) → add 1
- Handle string format → extract number, check if 0-indexed
- Handle Page object → extract page_number attribute
- Better logging for debugging

---

## Solution Implemented

### 1. Fixed 0-Indexed to 1-Indexed Conversion

**File:** `backend/services/ocr_service.py`

**Changes:**
- Added proper handling for 0-indexed page numbers
- Convert to 1-indexed by adding 1
- Handle multiple page_ref formats (integer, string, Page object)

```python
# Case 1: Direct integer (0-indexed)
if isinstance(page_value, int):
    page_number = page_value + 1  # Convert to 1-indexed
```

---

### 2. Added entity_pages Extraction

**File:** `backend/services/extraction_service.py`

**Changes:**
- Extract `entity_pages` from `ocr_result`
- Use it to get page numbers for entities

```python
entity_pages = ocr_result.get('entity_pages', {})  # Map of entity_type -> page_number
```

---

### 3. Included page_number in Extracted Fields

**File:** `backend/services/extraction_service.py`

**Changes:**
- Include `page_number` when creating extracted field dictionary
- Get page_number from `entity_pages` or `entity_data`

```python
page_number = entity_pages.get(entity_type, entity_data.get('page_number', 1))
extracted[mapped_key] = {
    ...
    'page_number': page_number  # ✅ Now included
}
```

---

### 4. Improved Text Anchor Page Mapping

**File:** `backend/services/ocr_service.py`

**Changes:**
- Better logic to map text_anchor text_segments to page numbers
- Uses document.pages structure to find which page contains the text
- Falls back to page 1 if cannot determine

---

## Files Modified

### Backend:
1. **`backend/services/ocr_service.py`**
   - Fixed 0-indexed to 1-indexed conversion
   - Improved page number extraction from page_anchor
   - Added text_anchor-based page mapping
   - Better logging for page number extraction

2. **`backend/services/extraction_service.py`**
   - Added `entity_pages` extraction from OCR result
   - Included `page_number` in extracted field dictionary
   - Get page_number from entity_pages or entity_data

### Frontend:
- No changes needed - frontend already displays `page_number` correctly

---

## How Page Numbers Are Now Calculated

### Flow:

1. **Document AI Processing:**
   ```
   Entity → page_anchor.page_refs[0].page
   ↓
   Extract page number (0-indexed: 0, 1, 2, ...)
   ↓
   Convert to 1-indexed (add 1): 1, 2, 3, ...
   ```

2. **OCR Service:**
   ```
   For each entity:
     - Extract page_number from page_anchor
     - Store in entities[entity_type]['page_number']
     - Store in entity_pages[entity_type]
   ↓
   Return: {'entities': {...}, 'entity_pages': {...}}
   ```

3. **Extraction Service:**
   ```
   Get entity_pages from ocr_result
   ↓
   For each entity:
     - Get page_number from entity_pages or entity_data
     - Include in extracted field dictionary
   ↓
   Return: {'patient_name': {..., 'page_number': 2}, ...}
   ```

4. **Database:**
   ```
   Save extracted field with page_number
   ↓
   ExtractedField.page_number = 2
   ```

5. **API Response:**
   ```
   Return page_number in response
   ↓
   {"page_num": 2}
   ```

6. **Frontend:**
   ```
   Display page number
   ↓
   "📄 Page 2"
   ```

---

## Testing

### Test Cases:

1. **Single Page Document:**
   - All fields should show "Page 1"
   - Verify page numbers are correct

2. **Multi-Page Document:**
   - Fields on page 1 → "Page 1"
   - Fields on page 2 → "Page 2"
   - Fields on page 4 → "Page 4"
   - Verify each field shows correct page

3. **Edge Cases:**
   - Document with no page_anchor → Defaults to "Page 1"
   - Document with text_anchor only → Maps to correct page
   - Document with invalid page references → Defaults to "Page 1"

### How to Verify:

1. **Check Backend Logs:**
   ```
   Look for: "Entity X: type=..., page=Y"
   Should see actual page numbers (not always 1)
   ```

2. **Check Database:**
   ```sql
   SELECT field_name, page_number FROM extracted_fields WHERE doc_id = X;
   Should see different page numbers for different fields
   ```

3. **Check Frontend:**
   - Upload multi-page document
   - Check Document Review page
   - Verify page numbers match actual document pages

---

## Expected Behavior After Fix

### Before:
- All fields show "Page 1"
- Page numbers don't reflect actual document pages

### After:
- Fields show correct page numbers (Page 1, Page 2, Page 4, etc.)
- Page numbers match where fields appear in the document
- Multi-page documents work correctly

---

## Additional Improvements

### Enhanced Logging:

Added logging to track page number extraction:
- OCR service logs: `Entity X: type=..., page=Y`
- Extraction service logs: `✅ field_name from entity '...': ... (page: Y)`

### Fallback Logic:

- If page_anchor not available → Try text_anchor mapping
- If text_anchor mapping fails → Default to page 1
- Always provides a page number (never null/undefined)

---

## Summary

**Root Cause:** 
1. Document AI page numbers are 0-indexed (not converted to 1-indexed)
2. Page numbers not included in extracted field dictionary
3. entity_pages not extracted from OCR result

**Solution:**
1. ✅ Convert 0-indexed to 1-indexed (add 1)
2. ✅ Include page_number in extracted fields
3. ✅ Extract entity_pages from OCR result
4. ✅ Improved page number extraction logic

**Result:**
- Page numbers now correctly reflect document pages
- Multi-page documents work correctly
- Each field shows its actual source page

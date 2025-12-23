# Date Format and Page Number Display Fix

## Issue Investigation

### Problem 1: Dates Not in MM/DD/YYYY Format in Match Information Section

**Root Cause:**
- Dates in the "Field-by-Field Matching" section were displayed directly from the API response without formatting
- The backend was already converting dates to MM/DD/YYYY, but:
  - `extracted_value` comes from `field.normalized_value or field.raw_value`
  - If `normalized_value` is missing, `raw_value` might be in a different format
  - Frontend was displaying values as-is without any date formatting

**Where Dates Come From:**
1. **Backend API** (`/matches/{doc_id}`):
   - `extracted_value`: From `ExtractedField.normalized_value` or `ExtractedField.raw_value`
   - `expected_value`: From `ClientProfile.dob/doa` formatted with `strftime('%m/%d/%Y')`
   - Backend already formats expected dates, but extracted dates might not always be normalized

2. **Frontend Display**:
   - Dates were displayed directly: `{fieldData.extracted_value}`
   - No date formatting function was applied

### Problem 2: Page Numbers Not Displayed for Extracted Fields

**Root Cause:**
- Page numbers were already in the API response (`fieldData.page_number`)
- Page numbers were shown in mismatch details but NOT in the "Field-by-Field Matching" section
- Extracted Fields section showed page numbers, but Field-by-Field Matching section did not

---

## Solution Implemented

### 1. Added Date Formatting Function (Frontend)

**File:** `src/pages/DocumentReviewPage.jsx`

Added `formatDateToMMDDYYYY()` helper function that:
- Checks if value is already in MM/DD/YYYY format
- Converts YYYY-MM-DD format to MM/DD/YYYY
- Handles Date object parsing
- Returns original value if parsing fails

```javascript
const formatDateToMMDDYYYY = (dateStr) => {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Not available') {
    return dateStr;
  }
  
  // If already in MM/DD/YYYY format, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try to parse and format the date
  try {
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${month}/${day}/${year}`;
    }
    
    // Try parsing as Date object
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
  } catch (e) {
    // If parsing fails, return original string
  }
  
  return dateStr;
};
```

### 2. Applied Date Formatting to Match Information Section

**File:** `src/pages/DocumentReviewPage.jsx`

**Changes:**
- **Extracted Value Display** (line ~520):
  ```javascript
  {(fieldKey === 'dob' || fieldKey === 'doa') 
    ? formatDateToMMDDYYYY(fieldData.extracted_value) 
    : fieldData.extracted_value || "—"}
  ```

- **Expected Value Display** (line ~536):
  ```javascript
  {(fieldKey === 'dob' || fieldKey === 'doa') 
    ? formatDateToMMDDYYYY(fieldData.expected_value || "Not available")
    : fieldData.expected_value || "Not available"}
  ```

- **Mismatch Details** (line ~350, 354):
  ```javascript
  {formatDateToMMDDYYYY(mismatch.expected_value || 'N/A')}
  {formatDateToMMDDYYYY(mismatch.observed_value || 'N/A')}
  ```

### 3. Added Page Number Display to Field-by-Field Matching

**File:** `src/pages/DocumentReviewPage.jsx`

**Changes:**
- Added page number badge next to "Extracted from Document" label:
  ```javascript
  <div className="flex items-start justify-between mb-1">
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
      Extracted from Document
    </p>
    {fieldData.page_number && (
      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
        📄 Page {fieldData.page_number}
      </span>
    )}
  </div>
  ```

### 4. Enhanced Extracted Fields Section

**File:** `src/pages/DocumentReviewPage.jsx`

**Changes:**
- Applied date formatting to extracted fields
- Improved page number display with badge styling
- Page number now appears inline with field name

### 5. Backend Date Normalization Enhancement

**File:** `backend/routes/matches.py`

**Changes:**
- Added additional date normalization for extracted values:
  ```python
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
  ```

---

## Files Modified

### Frontend:
1. **`src/pages/DocumentReviewPage.jsx`**
   - Added `formatDateToMMDDYYYY()` helper function
   - Applied date formatting to all date fields in Match Information section
   - Added page number display to Field-by-Field Matching section
   - Enhanced Extracted Fields section with date formatting and page numbers

### Backend:
2. **`backend/routes/matches.py`**
   - Added date normalization for extracted values to ensure MM/DD/YYYY format
   - Page numbers were already included in the response (no changes needed)

---

## How It Works

### Date Flow:

1. **Extraction Service** → Normalizes dates to MM/DD/YYYY
2. **Database** → Stores normalized dates
3. **Matches Route** → 
   - Retrieves dates from database
   - Additional normalization if needed (handles edge cases)
   - Formats expected dates from client profile
4. **Frontend** → 
   - Receives dates from API
   - Applies `formatDateToMMDDYYYY()` to ensure consistent formatting
   - Displays dates in MM/DD/YYYY format

### Page Number Flow:

1. **OCR Service** → Extracts page numbers from Document AI entities
2. **Extraction Service** → Includes page numbers in extracted fields
3. **Database** → Stores page numbers in `extracted_fields.page_number`
4. **Matches Route** → Includes page numbers in field_matches response
5. **Frontend** → Displays page numbers next to each field

---

## UI Enhancements

### Before:
- Dates displayed in various formats (YYYY-MM-DD, raw text, etc.)
- Page numbers only shown in mismatch details
- No page numbers in Field-by-Field Matching section

### After:
- ✅ All dates consistently in MM/DD/YYYY format
- ✅ Page numbers displayed next to each extracted field
- ✅ Page numbers shown in Field-by-Field Matching section
- ✅ Page numbers shown in Extracted Fields section
- ✅ Page numbers shown in Mismatch Details section

---

## Testing

### Test Cases:

1. **Date Formatting:**
   - Upload document with dates in various formats
   - Verify all dates display as MM/DD/YYYY in:
     - Extracted Fields section
     - Field-by-Field Matching section
     - Mismatch Details section

2. **Page Numbers:**
   - Upload multi-page document
   - Verify page numbers appear:
     - Next to each extracted field
     - In Field-by-Field Matching section
     - In Mismatch Details section

3. **Edge Cases:**
   - Documents with missing dates → Shows "Not available"
   - Documents with invalid dates → Shows original value
   - Single-page documents → Shows "Page 1"

---

## Backend Data Already Available

✅ **Page numbers are already in the database:**
- `extracted_fields.page_number` column exists
- `mismatches.page_number` column exists
- Backend already includes `page_number` in API responses

✅ **No additional backend changes needed** - All data is already available!

---

## Summary

### Changes Made:
1. ✅ Added date formatting function to frontend
2. ✅ Applied MM/DD/YYYY formatting to all date displays
3. ✅ Added page number display to Field-by-Field Matching section
4. ✅ Enhanced Extracted Fields section with page numbers
5. ✅ Added backend date normalization for edge cases

### Result:
- All dates now consistently display in MM/DD/YYYY format
- Page numbers are clearly visible next to each extracted field
- Better user experience with consistent formatting

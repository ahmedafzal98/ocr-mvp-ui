# Excel Export Improvements

## Overview
Enhanced the Excel export functionality to create comprehensive, well-formatted reports with all extracted data, matching information, and field-by-field comparisons.

## Features

### 1. Multiple Sheets
The Excel export now includes multiple sheets for better organization:

- **Summary Sheet**: Overall document information and match status
- **Field Matching Sheet**: Field-by-field comparison with match status
- **Mismatches Sheet**: Detailed mismatch information (only if mismatches exist)
- **Service Dates Sheet**: Service dates information (if available)

### 2. Comprehensive Data

#### Summary Sheet Includes:
- Document ID
- File Name
- Processed At (timestamp)
- Match Status (match/ambiguous/no_match)
- Match Score (%)
- Matched Client ID
- Matched Client Name

#### Field Matching Sheet Includes:
- **Patient Name**: Extracted value, Expected value, Match status, Confidence
- **Date of Birth**: Extracted value, Expected value, Match status, Confidence
- **Date of Accident**: Extracted value, Expected value, Match status, Confidence
- **Referral Number**: Extracted value, Match status, Confidence

#### Mismatches Sheet (if any):
- Field name
- Expected value from dataset
- Observed value from document
- Mismatch type

#### Service Dates Sheet (if available):
- All service dates extracted from the document

### 3. Professional Formatting

#### Color Coding:
- **Green**: Matched fields
- **Red**: Mismatched fields
- **Yellow**: Fields not in dataset
- **Gray**: Not applicable fields

#### Styling:
- Bold headers with colored backgrounds
- Borders on all cells
- Auto-adjusted column widths
- Text wrapping for long values
- Professional color scheme

### 4. Match Status Indicators

Each field shows one of:
- **Matched**: Field matches between document and dataset
- **Mismatch**: Field does not match (highlighted in red)
- **Not in Dataset**: Field extracted but not in client dataset
- **N/A**: Field not checked against dataset (e.g., referral)

## Excel File Structure

```
┌─────────────────────────────────────────┐
│ Summary Sheet                          │
│ - Document info                        │
│ - Match summary                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Field Matching Sheet                   │
│ - All 4 fields with comparison         │
│ - Color-coded match status             │
│ - Confidence scores                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Mismatches Sheet (if any)              │
│ - Detailed mismatch information        │
│ - Red highlighting                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Service Dates Sheet (if available)     │
│ - All service dates                     │
└─────────────────────────────────────────┘
```

## Usage

1. Navigate to a document review page
2. Click "Export to Excel" button
3. Excel file will be generated and downloaded
4. File includes all sheets with formatted data

## Technical Details

### Backend Changes (`backend/services/export_service.py`):

1. **Enhanced Data Collection**:
   - Collects all 4 fields (patient_name, dob, doa, referral)
   - Includes confidence scores for each field
   - Handles service dates (can be list or string)
   - Gets client name from matched profile

2. **Multiple DataFrames**:
   - Creates separate DataFrames for each sheet
   - Conditionally includes sheets (mismatches, service dates)

3. **Excel Formatting**:
   - Uses `openpyxl` for advanced formatting
   - Applies colors, borders, fonts
   - Auto-adjusts column widths
   - Wraps text for readability

4. **Formatting Functions**:
   - `_format_summary_sheet()`: Blue header, professional styling
   - `_format_fields_sheet()`: Green header, color-coded rows
   - `_format_mismatches_sheet()`: Red header, red rows for mismatches
   - `_format_service_dates_sheet()`: Blue header, clean layout

## Example Export

When you export a document, you'll get:

**Summary Sheet:**
- Document ID: 1
- File Name: document.pdf
- Match Status: match
- Match Score: 95.5%
- Matched Client: John Doe

**Field Matching Sheet:**
- ✅ Patient Name: Matched (John Doe)
- ✅ Date of Birth: Matched (1980-01-15)
- ❌ Date of Accident: Mismatch (2023-05-20 vs 2023-05-21)
- ℹ️ Referral Number: N/A (REF-12345)

**Mismatches Sheet:**
- DOA: Expected 2023-05-21, Observed 2023-05-20

## Benefits

1. **Complete Information**: All extracted data and matching results in one file
2. **Easy to Understand**: Color coding and clear labels
3. **Professional**: Well-formatted, ready for sharing
4. **Comprehensive**: Multiple sheets for different aspects
5. **Actionable**: Clear indication of what matched and what didn't

The export now provides a complete, professional report of all document processing results!


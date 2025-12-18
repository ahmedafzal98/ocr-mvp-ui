# Field Extraction Debugging Guide

## Added Comprehensive Logging

I've added detailed logging throughout the extraction process. When you upload a document, check your backend console for:

### 1. OCR Processing Logs
```
🔍 Starting OCR processing...
📋 Using Document AI Processor: projects/267816589183/locations/us/processors/3bd2a3a3becdadcb
📄 Document AI returned text length: [number]
📋 Processing [X] entities from Document AI
   Entity 1: type=[type], value=[value], confidence=[score]
✅ Processed [X] unique entity types: [list]
```

### 2. Field Extraction Logs
```
📝 Extracting fields from OCR result...
🔍 Field extraction summary:
   Full text length: [number]
   Entities from Document AI: [number]
   Fields extracted: [number]
   ✅ patient_name: [value] (confidence: [score])
   ✅ dob: [value] (confidence: [score])
   ✅ doa: [value] (confidence: [score])
   ✅ referral: [value] (confidence: [score])
```

### 3. Detailed Field Print
```
============================================================
📊 EXTRACTED FIELDS DETAIL:
============================================================
  Field: patient_name
    Raw Value: [value]
    Normalized Value: [value]
    Confidence: [score]

  Field: dob
    Raw Value: [value]
    Normalized Value: [value]
    Confidence: [score]
...
============================================================
```

## What to Check

1. **OCR Text Extraction:**
   - Look for "OCR extracted [X] characters of text"
   - If 0 characters, OCR is not working
   - Check "OCR Text Preview" to see what text was extracted

2. **Document AI Entities:**
   - Look for "Found [X] entities from Document AI"
   - If 0 entities, Document AI custom extractor may not be configured
   - Check entity types listed

3. **Field Extraction:**
   - Look for "Extracted [X] fields"
   - Should see 4 fields: patient_name, dob, doa, referral
   - Check the detailed field print section

## Common Issues

### Issue 1: No Text Extracted
**Symptom:** "OCR extracted 0 characters"
**Possible Causes:**
- Document AI API not enabled
- Wrong processor ID
- Document format not supported
- GCS credentials not set

### Issue 2: No Entities from Document AI
**Symptom:** "Found 0 entities from Document AI"
**Possible Causes:**
- Custom extractor not configured
- Processor ID incorrect
- Document doesn't match extractor schema

### Issue 3: Fields Not Extracted
**Symptom:** "NO FIELDS EXTRACTED!" but text exists
**Possible Causes:**
- Text format doesn't match extraction patterns
- Keywords not found in text
- Date formats not recognized

## Next Steps

1. **Restart backend** to load new logging
2. **Upload a document**
3. **Watch the console logs** - you'll see exactly what's being extracted
4. **Share the logs** if fields aren't extracting - I can help fix the patterns

## Verification

Your .env file is correctly configured:
- ✅ PROJECT_ID=267816589183
- ✅ LOCATION=us
- ✅ PROCESSOR_ID=3bd2a3a3becdadcb
- ✅ GCS_BUCKET_NAME=personal-injury-document-bucket

Make sure `GOOGLE_APPLICATION_CREDENTIALS` is set if using service account key.


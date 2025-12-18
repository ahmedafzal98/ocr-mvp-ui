# Troubleshooting: Documents Stuck in Pending

## Issue
Documents are uploaded successfully but remain in "pending" state for 2-3 minutes.

## Added Comprehensive Logging

I've added detailed logging throughout the process. Check your backend console/logs to see where it's failing.

## Common Issues & Solutions

### 1. Google Cloud Storage (GCS) Credentials
**Symptoms:** GCS upload fails silently
**Solution:**
```bash
# Set Google Cloud credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"

# Verify credentials
gcloud auth application-default login
```

### 2. Document AI API Not Enabled
**Symptoms:** OCR processing fails
**Solution:**
```bash
# Enable Document AI API
gcloud services enable documentai.googleapis.com

# Verify processor exists
gcloud ai document processors list --location=us
```

### 3. GCS Bucket Doesn't Exist
**Symptoms:** Upload fails
**Solution:**
```bash
# Create bucket if it doesn't exist
gsutil mb -p 267816589183 -l us gs://personal-injury-document-bucket

# Verify bucket exists
gsutil ls gs://personal-injury-document-bucket
```

### 4. Background Task Not Running
**Symptoms:** Task added but never executes
**Solution:**
- Check backend logs for "🚀 Starting background task"
- Verify uvicorn is running with proper workers
- Check for any import errors

### 5. Database Connection Issues
**Symptoms:** Status updates fail
**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check database connection in `.env`
- Verify tables exist: `psql -U mbp -d document_extraction_db -c "\dt"`

## Debugging Steps

1. **Check Backend Logs:**
   Look for these log messages:
   - `📤 Starting upload for file: ...`
   - `✅ Uploaded to GCS: ...`
   - `📤 Adding background task for document ...`
   - `🚀 Starting background task for document ...`
   - `🔍 Starting OCR processing...`
   - `✅ Document processing completed successfully!`

2. **Test GCS Upload Manually:**
   ```python
   from services.ocr_service import OCRService
   service = OCRService()
   # Test with a small file
   ```

3. **Test Document AI:**
   ```python
   from services.ocr_service import OCRService
   service = OCRService()
   # Check if processor is accessible
   ```

4. **Check Background Task Execution:**
   - Look for "🚀 Starting background task" in logs
   - If not present, task isn't being called
   - If present but stops, check error messages

## Quick Fixes

### Enable Debug Logging
Add to your `.env`:
```env
DEBUG=True
```

### Check Environment Variables
```bash
cd backend
cat .env | grep -E "PROJECT_ID|PROCESSOR_ID|GCS_BUCKET"
```

### Verify Services
```bash
# Check if services can be imported
cd backend
python3 -c "from services.ocr_service import OCRService; print('OK')"
```

## What to Look For in Logs

When you upload a document, you should see:
1. `📤 Starting upload for file: ...`
2. `☁️ Uploading to Google Cloud Storage...`
3. `✅ Uploaded to GCS: gs://...`
4. `✅ Document record created with ID: ...`
5. `📤 Adding background task for document ...`
6. `🚀 Starting background task for document ...`
7. `🔍 Starting OCR processing...`
8. `✅ OCR successful...`
9. `✅ Document processing completed successfully!`

If any step is missing, that's where the issue is!


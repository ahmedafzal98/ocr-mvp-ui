# Complete Deployment Guide

## Step 1: Add page_number Column to Database

Run the migration first before redeploying:

### Option A: Using gcloud beta (Recommended)

```bash
gcloud beta sql connect document-db \
  --user=dbuser \
  --database=document_extraction_db \
  --project=elliptical-feat-476423-q8
```

When prompted, enter password: `MGPlyP9fyXm9HWa4`

Then paste and run:
```sql
ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
\q
```

### Option B: If Option A doesn't work

Use Cloud SQL Proxy (see `scripts/run-migration-via-proxy.sh`)

## Step 2: Redeploy Backend

```bash
cd /Users/mbp/ocr-mvp-ui
./scripts/redeploy-backend.sh
```

This will:
- Build new Docker image with fixes
- Deploy to Cloud Run
- Include improved error handling
- Handle page_number column gracefully

## Step 3: Redeploy Frontend

### Option A: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select project: **ocr-mvp-ui**
3. **Deployments** → Click **⋯** on latest → **Redeploy**

### Option B: Via Git

```bash
cd /Users/mbp/ocr-mvp-ui
git add .
git commit -m "Fix API URLs and 401 errors"
git push origin main
```

Vercel will auto-deploy.

## What Was Fixed

### Backend:
- ✅ Better error handling in background tasks
- ✅ Status always updated even on early failures
- ✅ Graceful handling of missing page_number column
- ✅ Improved database error handling

### Frontend:
- ✅ Centralized API configuration
- ✅ Fixed missing imports
- ✅ All files use environment variables correctly
- ✅ Proper 401 error handling

### Database:
- ⚠️ Need to run migration to add page_number column

## Verification

After deployment:

1. **Test backend endpoint:**
   ```bash
   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/64/extracted-fields \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Should return 200 OK (not 500)

2. **Test frontend:**
   - Visit https://ocr-mvp-ui.vercel.app
   - Check browser console - should not see localhost URLs
   - Check Network tab - requests should go to production backend

3. **Test document upload:**
   - Upload a document
   - Should complete processing (not stuck in "processing")
   - Check logs if it fails - better error messages now


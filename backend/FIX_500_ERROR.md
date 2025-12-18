# Fix 500 Internal Server Error on /documents/

## Problem
Getting 500 error when accessing `/documents/` endpoint on deployed backend.

## Root Cause
The database connection is not configured. The endpoint tries to query the database but fails because:
- Database environment variables are not set in Cloud Run
- Database connection cannot be established

## Solution: Set Database Environment Variables

### Step 1: Go to Cloud Run Console

1. **Go to:** https://console.cloud.google.com/run
2. **Select your project:** `elliptical-feat-476423-q8` (or `267816589183`)
3. **Click on service:** `document-mismatch-detection-api`
4. **Click "Edit & Deploy New Revision"**

### Step 2: Add Environment Variables

Go to **"Variables & Secrets"** tab and add:

**Variable 1:**
- Key: `DB_HOST`
- Value: Your database host (e.g., `127.0.0.1` or Cloud SQL connection name)

**Variable 2:**
- Key: `DB_PORT`
- Value: `5432` (or your PostgreSQL port)

**Variable 3:**
- Key: `DB_USER`
- Value: Your database username

**Variable 4:**
- Key: `DB_PASSWORD`
- Value: Your database password

**Variable 5:**
- Key: `DB_NAME`
- Value: `document_extraction_db` (or your database name)

### Step 3: Deploy

1. Click **"Deploy"** button
2. Wait for deployment to complete (1-2 minutes)

### Step 4: Verify

1. **Check health endpoint:**
   ```bash
   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/health
   ```
   Should return: `{"status": "healthy"}`

2. **Check database health:**
   ```bash
   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/health/db
   ```
   Should return: `{"status": "healthy", "database": "connected"}`

3. **Test documents endpoint:**
   ```bash
   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/
   ```
   Should return: `{"documents": []}` (empty array if no documents)

## Using Cloud SQL (Recommended for Production)

If you're using Google Cloud SQL:

1. **Get connection name:**
   ```bash
   gcloud sql instances describe YOUR_INSTANCE_NAME --format="value(connectionName)"
   ```

2. **Set environment variables:**
   - `DB_HOST`: Use Cloud SQL connection name or IP
   - `DB_PORT`: `5432`
   - `DB_USER`: Your Cloud SQL user
   - `DB_PASSWORD`: Your Cloud SQL password
   - `DB_NAME`: Your database name

3. **Add Cloud SQL connection:**
   - In Cloud Run deployment, go to "Connections" tab
   - Add Cloud SQL instance
   - Select your instance

## Using External Database

If using an external PostgreSQL database:

1. **Make sure database is accessible from Cloud Run:**
   - Whitelist Cloud Run IPs (if firewall enabled)
   - Or use public IP with proper security

2. **Set environment variables:**
   - `DB_HOST`: Database public IP or hostname
   - `DB_PORT`: `5432`
   - `DB_USER`: Database username
   - `DB_PASSWORD`: Database password
   - `DB_NAME`: Database name

## Quick Fix via CLI

```bash
gcloud run services update document-mismatch-detection-api \
  --region us-central1 \
  --update-env-vars "DB_HOST=your-host,DB_PORT=5432,DB_USER=your-user,DB_PASSWORD=your-password,DB_NAME=document_extraction_db"
```

## Verify Database Connection

After setting variables, check logs:

```bash
gcloud run services logs read document-mismatch-detection-api --region us-central1 --limit 50
```

Look for:
- ✅ "Database connection successful"
- ❌ "Database connection error" or "OperationalError"

## Troubleshooting

### Still getting 500 error?

1. **Check logs:**
   ```bash
   gcloud run services logs read document-mismatch-detection-api --region us-central1
   ```

2. **Verify environment variables are set:**
   ```bash
   gcloud run services describe document-mismatch-detection-api --region us-central1 --format="value(spec.template.spec.containers[0].env)"
   ```

3. **Test database connection:**
   - Use `/health/db` endpoint
   - Check error message for specific issue

### Common Issues

1. **"Connection refused"**
   - Database is not accessible from Cloud Run
   - Check firewall rules
   - Verify database is running

2. **"Authentication failed"**
   - Wrong username/password
   - Check credentials

3. **"Database does not exist"**
   - Database name is incorrect
   - Create database if it doesn't exist

4. **"Table does not exist"**
   - Database tables not created
   - Tables should be created automatically on first run
   - Or run: `python init_db.py` locally and migrate

## After Fix

Once database is connected:
- ✅ `/health` returns healthy
- ✅ `/health/db` returns connected
- ✅ `/documents/` returns list (empty or with documents)
- ✅ Can upload documents
- ✅ Can process documents


# Quick Fix: Set Database Environment Variables

## Current Error
```
Database connection error: connection to server at "127.0.0.1", port 5432 failed: Connection refused
```

This means database environment variables are not set in Cloud Run.

## Solution Options

### Option 1: Using the Script (Easiest)

```bash
cd backend
./set-database-env.sh
```

The script will prompt you for:
- DB_HOST
- DB_PORT (default: 5432)
- DB_USER
- DB_PASSWORD
- DB_NAME (default: document_extraction_db)

### Option 2: Using gcloud CLI (Manual)

```bash
gcloud run services update document-mismatch-detection-api \
  --region us-central1 \
  --update-env-vars "DB_HOST=your-host,DB_PORT=5432,DB_USER=your-user,DB_PASSWORD=your-password,DB_NAME=document_extraction_db"
```

### Option 3: Using Cloud Run Console (Visual)

1. **Go to:** https://console.cloud.google.com/run/detail/us-central1/document-mismatch-detection-api
2. **Click:** "Edit & Deploy New Revision"
3. **Go to:** "Variables & Secrets" tab
4. **Click:** "Add Variable" for each:
   - `DB_HOST` = your database host
   - `DB_PORT` = `5432`
   - `DB_USER` = your database user
   - `DB_PASSWORD` = your database password
   - `DB_NAME` = `document_extraction_db`
5. **Click:** "Deploy"

## Database Options

### Option A: Use Existing Database

If you have a PostgreSQL database:
- Use its host/IP as `DB_HOST`
- Use its credentials for `DB_USER` and `DB_PASSWORD`

### Option B: Create Cloud SQL (Recommended for Production)

1. **Create Cloud SQL instance:**
   ```bash
   gcloud sql instances create document-db \
     --database-version=POSTGRES_14 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Create database:**
   ```bash
   gcloud sql databases create document_extraction_db \
     --instance=document-db
   ```

3. **Create user:**
   ```bash
   gcloud sql users create dbuser \
     --instance=document-db \
     --password=YOUR_PASSWORD
   ```

4. **Get connection name:**
   ```bash
   gcloud sql instances describe document-db --format="value(connectionName)"
   ```

5. **Set environment variables:**
   - `DB_HOST`: Use the connection name from above
   - `DB_PORT`: `5432`
   - `DB_USER`: `dbuser`
   - `DB_PASSWORD`: The password you set
   - `DB_NAME`: `document_extraction_db`

6. **Connect Cloud SQL to Cloud Run:**
   - In Cloud Run service, go to "Connections" tab
   - Add Cloud SQL instance: `document-db`

### Option C: Use Local Database (For Testing Only)

If you want to test with a local database temporarily:
- Use a service like ngrok to expose your local database
- Or use a cloud-hosted PostgreSQL (like Supabase, Neon, etc.)

## Verify After Setting

```bash
# Check database health
curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/health/db

# Should return: {"status": "healthy", "database": "connected"}

# Test documents endpoint
curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/

# Should return: {"documents": []} (or list of documents)
```

## Troubleshooting

### Still getting connection error?

1. **Check logs:**
   ```bash
   gcloud run services logs read document-mismatch-detection-api --region us-central1 --limit 50
   ```

2. **Verify variables are set:**
   ```bash
   gcloud run services describe document-mismatch-detection-api --region us-central1 --format="value(spec.template.spec.containers[0].env)"
   ```

3. **Test database connectivity:**
   - Make sure database is accessible from Cloud Run
   - Check firewall rules
   - For Cloud SQL, ensure instance is connected in Cloud Run

### Common Issues

- **"Connection refused"**: Database not accessible or wrong host
- **"Authentication failed"**: Wrong username/password
- **"Database does not exist"**: Wrong database name or database not created


# Fix IPv6 Connection Issue - Run Migration

## Problem

You're getting an IPv6 error when trying to connect directly to Cloud SQL. Cloud SQL Second Generation doesn't support IPv6 connections.

## Solution: Use Cloud SQL Proxy

### Option 1: Using Python Script (Easiest - Recommended)

This method uses the existing Python migration script and connects through Cloud SQL automatically:

```bash
cd /Users/mbp/ocr-mvp-ui
./scripts/run-migration-python.sh
```

**Requirements:**
- Python 3 with psycopg2 installed
- Database credentials (already in the script)

### Option 2: Using Cloud SQL Proxy + psql

1. **Install Cloud SQL Proxy** (if not installed):

   ```bash
   # macOS ARM64 (M1/M2 Mac)
   curl -o /usr/local/bin/cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64
   chmod +x /usr/local/bin/cloud-sql-proxy
   
   # Or use Homebrew
   brew install cloud-sql-proxy
   ```

2. **Run the migration script:**

   ```bash
   cd /Users/mbp/ocr-mvp-ui
   ./scripts/run-migration-via-proxy.sh
   ```

   This will:
   - Start Cloud SQL Proxy in the background
   - Connect via localhost (IPv4)
   - Run the migration
   - Stop the proxy automatically

### Option 3: Manual Cloud SQL Proxy

1. **Start Cloud SQL Proxy in one terminal:**

   ```bash
   cloud-sql-proxy elliptical-feat-476423-q8:us-central1:document-db --port 5433
   ```

2. **In another terminal, run the migration:**

   ```bash
   cd /Users/mbp/ocr-mvp-ui/backend
   export PGPASSWORD="MGPlyP9fyXm9HWa4"
   psql -h 127.0.0.1 -p 5433 -U dbuser -d document_extraction_db -f database/migrations/add_page_number_columns.sql
   ```

### Option 4: Using gcloud beta (Uses Proxy Automatically)

```bash
gcloud beta sql connect document-db \
  --user=dbuser \
  --database=document_extraction_db \
  --project=elliptical-feat-476423-q8
```

Then paste:
```sql
ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
\q
```

## Recommended: Python Script Method

The easiest is to use the Python script:

```bash
cd /Users/mbp/ocr-mvp-ui
chmod +x scripts/run-migration-python.sh
./scripts/run-migration-python.sh
```

This will:
- ✅ Work around IPv6 issues automatically
- ✅ Use Cloud SQL connection string
- ✅ Run the migration safely
- ✅ Handle all the connection details

## What the Migration Does

Adds the `page_number` column to:
- `extracted_fields` table
- `mismatches` table

Both get `INTEGER DEFAULT 1` (safe default for existing rows).

## Verify After Migration

Test the endpoint:

```bash
curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/64/extracted-fields \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return 200 OK (not 500 error).


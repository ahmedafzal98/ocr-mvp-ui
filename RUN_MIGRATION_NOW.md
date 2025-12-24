# Quick Fix: Run Database Migration to Fix 500 Error

## The Problem

Error: `column extracted_fields.page_number does not exist`

The production database needs the `page_number` column added.

## Quick Fix (Choose One Method)

### Method 1: Using gcloud sql connect (Easiest)

```bash
# Connect to your Cloud SQL database
gcloud sql connect document-db \
  --user=dbuser \
  --database=document_extraction_db \
  --project=elliptical-feat-476423-q8
```

When prompted, enter the database password: `MGPlyP9fyXm9HWa4`

Then copy and paste this SQL:

```sql
-- Add page_number to extracted_fields
ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;

-- Add page_number to mismatches  
ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
```

Type `\q` to exit.

### Method 2: One-line SQL Command

```bash
gcloud sql connect document-db \
  --user=dbuser \
  --database=document_extraction_db \
  --project=elliptical-feat-476423-q8 \
  --quiet <<EOF
ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
\q
EOF
```

### Method 3: Using Python Script (If you have DB credentials set locally)

```bash
cd /Users/mbp/ocr-mvp-ui/backend

# Set environment variables
export DB_HOST="elliptical-feat-476423-q8:us-central1:document-db"
export DB_USER="dbuser"
export DB_PASSWORD="MGPlyP9fyXm9HWa4"
export DB_NAME="document_extraction_db"

# Run migration
python3 run_migration.py
```

## What This Does

- Adds `page_number` column to `extracted_fields` table
- Adds `page_number` column to `mismatches` table
- Sets default value to 1 for all existing rows
- Safe to run multiple times (IF NOT EXISTS prevents errors)

## After Running Migration

1. The 500 error should be fixed
2. Test the endpoint:
   ```bash
   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/64/extracted-fields \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. Should return 200 OK with field data

## Verification

Check if column exists:

```bash
gcloud sql connect document-db \
  --user=dbuser \
  --database=document_extraction_db \
  --project=elliptical-feat-476423-q8
```

Then run:
```sql
\d extracted_fields
```

You should see `page_number` in the column list.


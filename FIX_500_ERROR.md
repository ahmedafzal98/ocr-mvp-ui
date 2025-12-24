# Fix 500 Error: Missing page_number Column

## Error

```
psycopg2.errors.UndefinedColumn: column extracted_fields.page_number does not exist
```

## Cause

The production database is missing the `page_number` column that was added to the code. The migration hasn't been run on production yet.

## Solution: Run Database Migration

You need to add the `page_number` column to your production Cloud SQL database.

### Option 1: Using gcloud sql connect (Recommended - Easiest)

```bash
cd /Users/mbp/ocr-mvp-ui
./scripts/run-production-migration.sh
```

This will:
1. Connect to your Cloud SQL instance
2. Run the migration SQL
3. Add the `page_number` column to both tables

**Requirements:**
- gcloud CLI installed and authenticated
- Database password (will be prompted)

### Option 2: Manual via gcloud

```bash
# Connect to the database
gcloud sql connect document-db \
  --user=dbuser \
  --database=document_extraction_db \
  --project=elliptical-feat-476423-q8

# Then paste and run this SQL:
```

```sql
-- Add page_number to extracted_fields
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'extracted_fields' 
        AND column_name = 'page_number'
    ) THEN
        ALTER TABLE extracted_fields ADD COLUMN page_number INTEGER DEFAULT 1;
        RAISE NOTICE 'Added page_number column to extracted_fields';
    ELSE
        RAISE NOTICE 'page_number column already exists in extracted_fields';
    END IF;
END $$;

-- Add page_number to mismatches
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mismatches' 
        AND column_name = 'page_number'
    ) THEN
        ALTER TABLE mismatches ADD COLUMN page_number INTEGER DEFAULT 1;
        RAISE NOTICE 'Added page_number column to mismatches';
    ELSE
        RAISE NOTICE 'page_number column already exists in mismatches';
    END IF;
END $$;
```

Then type `\q` to exit.

### Option 3: Using Cloud SQL Proxy + psql

If you prefer using psql directly:

```bash
cd /Users/mbp/ocr-mvp-ui
./scripts/run-migration-cloud-sql.sh
```

**Requirements:**
- cloud-sql-proxy installed
- Database credentials

## Verify Migration

After running the migration, test the endpoint:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/64/extracted-fields
```

Should return 200 OK with field data.

## Quick Fix Script

The easiest way is to run:

```bash
cd /Users/mbp/ocr-mvp-ui
./scripts/run-production-migration.sh
```

Follow the prompts and enter your database password when asked.

## What This Migration Does

1. Adds `page_number INTEGER` column to `extracted_fields` table
2. Adds `page_number INTEGER` column to `mismatches` table
3. Sets default value to 1 for existing rows
4. Uses PostgreSQL's `DO $$` block to check if columns exist first (safe to run multiple times)

## After Migration

The 500 error should be resolved and the endpoint should work correctly. The code already handles `page_number` being NULL (defaults to 1), so once the column exists, everything should work.


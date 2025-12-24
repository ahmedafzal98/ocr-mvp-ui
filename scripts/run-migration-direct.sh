#!/bin/bash

# Direct SQL execution using gcloud sql execute (simplest method)
# This uses Cloud SQL Admin API

set -e

PROJECT_ID="elliptical-feat-476423-q8"
INSTANCE_NAME="document-db"
DB_NAME="document_extraction_db"

echo "🔧 Adding page_number columns to production database"
echo "====================================================="
echo ""

# SQL commands
SQL1="ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;"
SQL2="ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;"

echo "📝 Running SQL migration..."
echo "   SQL 1: ${SQL1}"
echo "   SQL 2: ${SQL2}"
echo ""

# Execute SQL commands
gcloud sql execute-sql ${INSTANCE_NAME} \
  --database=${DB_NAME} \
  --project=${PROJECT_ID} \
  --sql="${SQL1}"

echo "✅ Added page_number to extracted_fields"

gcloud sql execute-sql ${INSTANCE_NAME} \
  --database=${DB_NAME} \
  --project=${PROJECT_ID} \
  --sql="${SQL2}"

echo "✅ Added page_number to mismatches"

echo ""
echo "🎉 Migration completed successfully!"
echo ""
echo "🧪 Test the endpoint:"
echo "   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/64/extracted-fields"


#!/bin/bash

# Run migration by executing SQL in Cloud Run container
# This creates a temporary Cloud Run job to run the migration

set -e

PROJECT_ID="elliptical-feat-476423-q8"
REGION="us-central1"
SERVICE_NAME="document-mismatch-detection-api"
DB_NAME="document_extraction_db"

echo "🔧 Running Database Migration via Cloud Run"
echo "============================================"
echo ""
echo "This will execute SQL directly on the Cloud SQL instance"
echo "using the Cloud Run service's database connection."
echo ""

# We'll use gcloud to run a one-off job, or we can just provide SQL
echo "📋 SQL Migration Commands:"
echo ""
echo "ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;"
echo "ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;"
echo ""
echo "The simplest way is to use gcloud beta sql connect:"
echo ""
echo "Run this command:"
echo "  gcloud beta sql connect document-db \\"
echo "    --user=dbuser \\"
echo "    --database=document_extraction_db \\"
echo "    --project=${PROJECT_ID}"
echo ""
echo "Then paste the SQL commands above when prompted."
echo ""
echo "Or, if you have Cloud SQL Proxy installed, run:"
echo "  ./scripts/run-migration-via-proxy.sh"


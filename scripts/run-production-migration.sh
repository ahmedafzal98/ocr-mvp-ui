#!/bin/bash

# Script to run database migration on production Cloud SQL
# This adds the page_number column to extracted_fields and mismatches tables

set -e

PROJECT_ID="elliptical-feat-476423-q8"
INSTANCE_NAME="document-db"
REGION="us-central1"
DB_NAME="document_extraction_db"
DB_USER="dbuser"

echo "🔧 Running Production Database Migration"
echo "========================================="
echo ""
echo "This will add the page_number column to:"
echo "  - extracted_fields table"
echo "  - mismatches table"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed."
    exit 1
fi

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "⚠️  cloud-sql-proxy not found. Installing instructions:"
    echo "   https://cloud.google.com/sql/docs/postgres/sql-proxy#install"
    echo ""
    echo "Or use the gcloud sql connect method below."
    exit 1
fi

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
MIGRATION_FILE="backend/database/migrations/add_page_number_columns.sql"

echo "📋 Migration Details:"
echo "   Connection: ${CONNECTION_NAME}"
echo "   Database: ${DB_NAME}"
echo "   Migration file: ${MIGRATION_FILE}"
echo ""

read -p "Continue with migration? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Migration cancelled."
    exit 1
fi

echo ""
echo "🚀 Running migration..."

# Method 1: Using gcloud sql connect (recommended)
echo "Using gcloud sql connect method..."
echo ""
echo "You'll need to enter the database password when prompted."
echo ""

# Read migration SQL
MIGRATION_SQL=$(cat "${MIGRATION_FILE}")

# Connect and run migration
gcloud sql connect ${INSTANCE_NAME} \
  --user=${DB_USER} \
  --database=${DB_NAME} \
  --project=${PROJECT_ID} \
  <<EOF
${MIGRATION_SQL}
\q
EOF

echo ""
echo "✅ Migration completed!"
echo ""
echo "🧪 Testing the fix..."
echo "   Try accessing the endpoint again to verify it works."


#!/bin/bash

# Run database migration using gcloud sql execute command
# This works around IPv6 and proxy issues

set -e

PROJECT_ID="elliptical-feat-476423-q8"
INSTANCE_NAME="document-db"
DB_NAME="document_extraction_db"
DB_USER="dbuser"

echo "🔧 Running Database Migration via gcloud sql execute"
echo "===================================================="
echo ""

# SQL migration commands
SQL_COMMANDS="ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1; ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;"

echo "📝 Adding page_number columns to:"
echo "   - extracted_fields"
echo "   - mismatches"
echo ""

# Use gcloud sql execute (beta command uses proxy automatically)
echo "🚀 Running migration..."
gcloud beta sql connect ${INSTANCE_NAME} \
  --user=${DB_USER} \
  --database=${DB_NAME} \
  --project=${PROJECT_ID} \
  --quiet <<EOF
${SQL_COMMANDS}
\q
EOF

echo ""
echo "✅ Migration completed!"


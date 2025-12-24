#!/bin/bash

# Run database migration using Python script
# This connects directly using the database connection settings

set -e

PROJECT_ID="elliptical-feat-476423-q8"
INSTANCE_NAME="document-db"
REGION="us-central1"
DB_NAME="document_extraction_db"
DB_USER="dbuser"
DB_PASSWORD="MGPlyP9fyXm9HWa4"

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

echo "🔧 Running Database Migration using Python"
echo "==========================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "${BACKEND_DIR}"

# Set environment variables for database connection
export DB_HOST="${CONNECTION_NAME}"
export DB_PORT="5432"
export DB_USER="${DB_USER}"
export DB_PASSWORD="${DB_PASSWORD}"
export DB_NAME="${DB_NAME}"

echo "📋 Connection details:"
echo "   Host: ${DB_HOST}"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo ""

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo "🔧 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  Virtual environment not found. Using system Python..."
fi

echo "🚀 Running migration..."
python3 run_migration.py

echo ""
echo "✅ Migration completed!"
echo ""
echo "🧪 Test the endpoint:"
echo "   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/64/extracted-fields"


#!/bin/bash

# Script to set database environment variables in Cloud Run
# Usage: ./set-database-env.sh

set -e

PROJECT_ID="267816589183"
SERVICE_NAME="document-mismatch-detection-api"
REGION="us-central1"

echo "🔧 Setting Database Environment Variables"
echo "=============================================="
echo ""

# Prompt for database credentials
read -p "Enter DB_HOST (database host/IP or Cloud SQL connection name): " DB_HOST
read -p "Enter DB_PORT (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "Enter DB_USER (database username): " DB_USER
read -s -p "Enter DB_PASSWORD (database password): " DB_PASSWORD
echo ""
read -p "Enter DB_NAME (default: document_extraction_db): " DB_NAME
DB_NAME=${DB_NAME:-document_extraction_db}

echo ""
echo "📋 Configuration:"
echo "   DB_HOST: $DB_HOST"
echo "   DB_PORT: $DB_PORT"
echo "   DB_USER: $DB_USER"
echo "   DB_NAME: $DB_NAME"
echo ""

read -p "Continue with deployment? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "🚀 Updating Cloud Run service with database environment variables..."

# Update the service with database environment variables
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --update-env-vars "DB_HOST=${DB_HOST},DB_PORT=${DB_PORT},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},DB_NAME=${DB_NAME}"

echo ""
echo "✅ Database environment variables set successfully!"
echo ""
echo "🧪 Testing database connection..."
sleep 5

# Test the database connection
DB_HEALTH=$(curl -s https://document-mismatch-detection-api-267816589183.us-central1.run.app/health/db)
echo "Response: $DB_HEALTH"
echo ""

if echo "$DB_HEALTH" | grep -q '"database":"connected"'; then
    echo "✅ Database connection successful!"
else
    echo "⚠️  Database connection failed. Please check:"
    echo "   1. Database is running and accessible"
    echo "   2. Firewall rules allow Cloud Run to connect"
    echo "   3. Credentials are correct"
    echo ""
    echo "Check logs:"
    echo "  gcloud run services logs read ${SERVICE_NAME} --region ${REGION} --limit 50"
fi


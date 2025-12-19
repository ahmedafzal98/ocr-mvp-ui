#!/bin/bash

# Script to set authentication environment variables in Cloud Run

set -e

PROJECT_ID=${PROJECT_ID:-"267816589183"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="document-mismatch-detection-api"

echo "🔐 Setting Authentication Environment Variables"
echo "================================================"
echo ""

# Check if JWT_SECRET_KEY is set
if [ -z "$JWT_SECRET_KEY" ]; then
    echo "⚠️  JWT_SECRET_KEY not set. Generating one..."
    JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || openssl rand -base64 32)
    echo "✅ Generated JWT_SECRET_KEY"
fi

# Prompt for admin credentials
if [ -z "$ADMIN_USERNAME" ]; then
    read -p "Enter admin username [admin]: " ADMIN_USERNAME
    ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
fi

if [ -z "$ADMIN_PASSWORD" ]; then
    read -sp "Enter admin password: " ADMIN_PASSWORD
    echo ""
    if [ -z "$ADMIN_PASSWORD" ]; then
        echo "❌ Password cannot be empty!"
        exit 1
    fi
fi

echo ""
echo "📋 Configuration:"
echo "   JWT_SECRET_KEY: ${JWT_SECRET_KEY:0:20}... (hidden)"
echo "   ADMIN_USERNAME: $ADMIN_USERNAME"
echo "   ADMIN_PASSWORD: *** (hidden)"
echo ""

read -p "Continue with these settings? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ Cancelled."
    exit 1
fi

echo ""
echo "🚀 Updating Cloud Run service..."

gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --update-env-vars="JWT_SECRET_KEY=${JWT_SECRET_KEY},ADMIN_USERNAME=${ADMIN_USERNAME},ADMIN_PASSWORD=${ADMIN_PASSWORD}"

echo ""
echo "✅ Authentication environment variables set!"
echo ""
echo "🧪 Test login:"
echo "   curl -X POST https://document-mismatch-detection-api-${PROJECT_ID}.${REGION}.run.app/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"YOUR_PASSWORD\"}'"
echo ""


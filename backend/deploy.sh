#!/bin/bash

# Cloud Run Deployment Script for Backend
# Make sure you have gcloud CLI installed and authenticated

set -e

PROJECT_ID=${PROJECT_ID:-"267816589183"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="document-mismatch-detection-api"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install it first."
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "⚠️  Warning: Not authenticated with gcloud. Please run: gcloud auth login"
    exit 1
fi

echo "🔨 Building Docker image..."
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .

echo "📤 Pushing to Google Container Registry..."
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

echo "🚀 Deploying to Cloud Run..."
# Note: DB_* environment variables can be set via Cloud Run console after deployment
# or passed as environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

# Build env vars string (DB vars can be added via console later)
ENV_VARS="PROJECT_ID=${PROJECT_ID},LOCATION=us,PROCESSOR_ID=3bd2a3a3becdadcb,GCS_BUCKET_NAME=personal-injury-document-bucket"

# Add DB env vars if they exist in environment
if [ ! -z "$DB_HOST" ]; then
  ENV_VARS="${ENV_VARS},DB_HOST=${DB_HOST}"
fi
if [ ! -z "$DB_PORT" ]; then
  ENV_VARS="${ENV_VARS},DB_PORT=${DB_PORT}"
fi
if [ ! -z "$DB_USER" ]; then
  ENV_VARS="${ENV_VARS},DB_USER=${DB_USER}"
fi
if [ ! -z "$DB_PASSWORD" ]; then
  ENV_VARS="${ENV_VARS},DB_PASSWORD=${DB_PASSWORD}"
fi
if [ ! -z "$DB_NAME" ]; then
  ENV_VARS="${ENV_VARS},DB_NAME=${DB_NAME}"
fi

gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars "${ENV_VARS}" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8000

echo "✅ Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo ""
echo "🎉 Backend deployed successfully!"
echo "📍 Service URL: ${SERVICE_URL}"
echo ""
echo "📝 Update your frontend .env with:"
echo "   VITE_API_BASE_URL=${SERVICE_URL}"
echo "   VITE_WS_BASE_URL=${SERVICE_URL/https:/wss:}"
echo ""


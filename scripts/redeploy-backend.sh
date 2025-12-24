#!/bin/bash

# Quick redeploy script - redeploys with existing env vars + new ones

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"

PROJECT_ID="elliptical-feat-476423-q8"
PROJECT_NUMBER="267816589183"
REGION="us-central1"
SERVICE_NAME="document-mismatch-detection-api"

echo "🚀 Redeploying Backend with Latest Changes"
echo "==========================================="
echo ""

# Set the project (using project ID)
gcloud config set project ${PROJECT_ID} --quiet

# Enable required APIs
echo "🔧 Ensuring required APIs are enabled..."
gcloud services enable cloudbuild.googleapis.com --project ${PROJECT_ID} --quiet || true
gcloud services enable run.googleapis.com --project ${PROJECT_ID} --quiet || true

# Build env vars string from existing deployment + new ones
ENV_VARS="PROJECT_ID=${PROJECT_NUMBER}"
ENV_VARS="${ENV_VARS},LOCATION=us"
ENV_VARS="${ENV_VARS},PROCESSOR_ID=3bd2a3a3becdadcb"
ENV_VARS="${ENV_VARS},GCS_BUCKET_NAME=personal-injury-document-bucket"
ENV_VARS="${ENV_VARS},DB_HOST=${PROJECT_ID}:us-central1:document-db"
ENV_VARS="${ENV_VARS},DB_PORT=5432"
ENV_VARS="${ENV_VARS},DB_USER=dbuser"
ENV_VARS="${ENV_VARS},DB_PASSWORD=MGPlyP9fyXm9HWa4"
ENV_VARS="${ENV_VARS},DB_NAME=document_extraction_db"
ENV_VARS="${ENV_VARS},JWT_SECRET_KEY=M3I_HUr_BgRbOqocgkw_OOFHBa3uChrGQfjrVxxJt34"
ENV_VARS="${ENV_VARS},ADMIN_USERNAME=admin"
ENV_VARS="${ENV_VARS},ADMIN_PASSWORD=develop123!"

# Add new environment variables for production mode
ENV_VARS="${ENV_VARS},ENVIRONMENT=production"
ENV_VARS="${ENV_VARS},LOG_LEVEL=INFO"

# CORS - allow all for now (can be restricted later if needed)
# Since frontend URL is not specified, allowing all origins
ENV_VARS="${ENV_VARS},CORS_ORIGINS=*"

echo "🔨 Building Docker image using Cloud Build..."
cd "${BACKEND_DIR}"

# Submit build to Cloud Build
echo "   This will take 5-10 minutes..."
gcloud builds submit \
  --project ${PROJECT_ID} \
  --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --timeout=20m \
  --quiet

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --project ${PROJECT_ID} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars "${ENV_VARS}" \
  --set-cloudsql-instances ${PROJECT_ID}:us-central1:document-db \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8000 \
  --quiet

echo "✅ Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo ""
echo "🎉 Backend redeployed successfully!"
echo "📍 Service URL: ${SERVICE_URL}"
echo ""
echo "✅ All changes have been deployed with:"
echo "   - Environment: production"
echo "   - All existing environment variables preserved"
echo "   - Latest code changes included"
echo ""


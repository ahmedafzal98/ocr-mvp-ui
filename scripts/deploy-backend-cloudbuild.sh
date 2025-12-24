#!/bin/bash

# Cloud Run Deployment Script using Cloud Build (no local Docker required)
# This script uses Google Cloud Build to build the image in the cloud

set -e

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"

PROJECT_ID=${PROJECT_ID:-"267816589183"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="document-mismatch-detection-api"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "⚠️  Warning: Not authenticated with gcloud. Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo "🔧 Setting GCP project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --quiet || true
gcloud services enable run.googleapis.com --quiet || true
gcloud services enable containerregistry.googleapis.com --quiet || true

# Build env vars string - Required Google Cloud settings
ENV_VARS="PROJECT_ID=${PROJECT_ID},LOCATION=us,PROCESSOR_ID=3bd2a3a3becdadcb,GCS_BUCKET_NAME=personal-injury-document-bucket"

# Environment detection (production mode)
ENV_VARS="${ENV_VARS},ENVIRONMENT=production"

# Add JWT secret key (required for production)
if [ ! -z "$JWT_SECRET_KEY" ]; then
  ENV_VARS="${ENV_VARS},JWT_SECRET_KEY=${JWT_SECRET_KEY}"
else
  echo "⚠️  WARNING: JWT_SECRET_KEY not set! Using default (INSECURE for production)"
  echo "   Set JWT_SECRET_KEY environment variable before deploying for production"
  read -p "Continue anyway? (y/n): " confirm
  if [ "$confirm" != "y" ]; then
    exit 1
  fi
fi

# Add admin credentials (optional, will use defaults if not set)
if [ ! -z "$ADMIN_USERNAME" ]; then
  ENV_VARS="${ENV_VARS},ADMIN_USERNAME=${ADMIN_USERNAME}"
fi
if [ ! -z "$ADMIN_PASSWORD" ]; then
  ENV_VARS="${ENV_VARS},ADMIN_PASSWORD=${ADMIN_PASSWORD}"
fi

# Add CORS origins (required for production)
if [ ! -z "$CORS_ORIGINS" ]; then
  ENV_VARS="${ENV_VARS},CORS_ORIGINS=${CORS_ORIGINS}"
else
  echo "⚠️  WARNING: CORS_ORIGINS not set! Allowing all origins (not recommended for production)"
fi

# Add log level
LOG_LEVEL=${LOG_LEVEL:-INFO}
ENV_VARS="${ENV_VARS},LOG_LEVEL=${LOG_LEVEL}"

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

echo "🔨 Building Docker image using Cloud Build..."
cd "${BACKEND_DIR}"

# Submit build to Cloud Build
gcloud builds submit \
  --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --timeout=20m

echo "🚀 Deploying to Cloud Run..."

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


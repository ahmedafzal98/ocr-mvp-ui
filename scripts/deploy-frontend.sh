#!/bin/bash

# Frontend Deployment Script for Cloud Run
# Alternative: Use Vercel or Netlify for easier deployment

set -e

PROJECT_ID=${PROJECT_ID:-"267816589183"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="document-mismatch-detection-ui"
BACKEND_URL=${BACKEND_URL:-"https://document-mismatch-detection-api-xxxxx.run.app"}

echo "Building frontend..."
npm install
npm run build

echo "Building Docker image..."
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME} .

echo "Pushing to Google Container Registry..."
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}

echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 80 \
  --set-env-vars "VITE_API_BASE_URL=${BACKEND_URL}"

echo "Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo "Frontend deployed at: ${SERVICE_URL}"
echo ""
echo "⚠️  IMPORTANT: Update the backend URL in your frontend code before building!"
echo "   Edit src/services/apiService.js and src/services/documentService.js"


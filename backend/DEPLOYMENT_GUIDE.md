# Backend Deployment Guide

## Prerequisites

1. **Google Cloud SDK** installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project 267816589183
   ```

2. **Docker** installed and running

3. **Enable required APIs:**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable documentai.googleapis.com
   gcloud services enable storage-api.googleapis.com
   ```

## Quick Deploy

```bash
cd backend
./deploy.sh
```

The script will:
1. Build Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Display the service URL

## Manual Deployment

### 1. Build and Push Docker Image

```bash
PROJECT_ID=267816589183
SERVICE_NAME="document-mismatch-detection-api"

docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "PROJECT_ID=${PROJECT_ID},LOCATION=us,PROCESSOR_ID=3bd2a3a3becdadcb,GCS_BUCKET_NAME=personal-injury-document-bucket,DB_HOST=your-db-host,DB_PORT=5432,DB_USER=your-db-user,DB_PASSWORD=your-db-password,DB_NAME=document_extraction_db" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8000
```

### 3. Get Service URL

```bash
gcloud run services describe ${SERVICE_NAME} --region=us-central1 --format='value(status.url)'
```

## Environment Variables

Required environment variables:
- `PROJECT_ID`: Google Cloud Project ID (267816589183)
- `LOCATION`: Document AI location (us)
- `PROCESSOR_ID`: Document AI Processor ID (3bd2a3a3becdadcb)
- `GCS_BUCKET_NAME`: Cloud Storage bucket name (personal-injury-document-bucket)
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USER`: PostgreSQL user
- `DB_PASSWORD`: PostgreSQL password
- `DB_NAME`: Database name (document_extraction_db)

## Google Cloud Credentials

The service will use the default service account. Make sure it has:
- Document AI API access
- Cloud Storage access
- Cloud SQL access (if using Cloud SQL)

Or set `GOOGLE_APPLICATION_CREDENTIALS` environment variable.

## Update Frontend

After deployment, update frontend environment variables:

1. Create/update `.env` in frontend root:
   ```env
   VITE_API_BASE_URL=https://your-service-url.run.app
   VITE_WS_BASE_URL=wss://your-service-url.run.app
   ```

2. Or set in Vercel:
   - Go to Project Settings → Environment Variables
   - Add `VITE_API_BASE_URL` and `VITE_WS_BASE_URL`

3. Redeploy frontend on Vercel

## Troubleshooting

### Check Logs
```bash
gcloud run services logs read ${SERVICE_NAME} --region=us-central1
```

### Update Service
```bash
# After code changes, rebuild and redeploy
./deploy.sh
```

### Check Service Status
```bash
gcloud run services describe ${SERVICE_NAME} --region=us-central1
```

## Health Check

After deployment, test the health endpoint:
```bash
curl https://your-service-url.run.app/health
```

Expected response:
```json
{"status": "healthy"}
```


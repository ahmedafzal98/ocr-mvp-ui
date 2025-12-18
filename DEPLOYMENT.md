# Deployment Guide

This guide will help you deploy both the backend and frontend applications.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed (for backend deployment)
4. **Node.js** and npm installed (for frontend build)

## Backend Deployment (Cloud Run)

### Step 1: Set up Google Cloud Project

```bash
# Set your project
gcloud config set project 267816589183

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable documentai.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### Step 2: Set up Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance (if not exists)
gcloud sql instances create document-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create document_extraction_db --instance=document-db

# Create user (if needed)
gcloud sql users create postgres \
  --instance=document-db \
  --password=Ahmed123!
```

### Step 3: Build and Deploy

```bash
cd backend

# Make deploy script executable
chmod +x deploy.sh

# Run deployment (or manually follow steps below)
./deploy.sh
```

**Manual Deployment Steps:**

```bash
# 1. Build Docker image
docker build -t gcr.io/267816589183/document-mismatch-detection-api .

# 2. Push to Container Registry
docker push gcr.io/267816589183/document-mismatch-detection-api

# 3. Deploy to Cloud Run
gcloud run deploy document-mismatch-detection-api \
  --image gcr.io/267816589183/document-mismatch-detection-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "PROJECT_ID=267816589183,LOCATION=us,PROCESSOR_ID=3bd2a3a3becdadcb,GCS_BUCKET_NAME=personal-injury-document-bucket,DB_HOST=/cloudsql/267816589183:us-central1:document-db,DB_PORT=5432,DB_USER=postgres,DB_PASSWORD=Ahmed123!,DB_NAME=document_extraction_db" \
  --add-cloudsql-instances 267816589183:us-central1:document-db \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

### Step 4: Get Backend URL

```bash
gcloud run services describe document-mismatch-detection-api \
  --region=us-central1 \
  --format='value(status.url)'
```

**Note:** Save this URL - you'll need it for frontend configuration.

## Frontend Deployment

### Option 1: Deploy to Vercel (Recommended - Easiest)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Create vercel.json configuration:**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "devCommand": "npm run dev",
     "installCommand": "npm install",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

3. **Deploy:**
   ```bash
   cd /path/to/ocr-mvp-ui
   vercel
   ```

4. **Update API URL:**
   - After deployment, update `src/services/apiService.js` and `src/services/documentService.js` with your Cloud Run backend URL
   - Redeploy frontend

### Option 2: Deploy to Cloud Run (Same Platform)

1. **Create Dockerfile for frontend:**
   ```dockerfile
   FROM node:18-alpine as builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Create nginx.conf:**
   ```nginx
   server {
     listen 80;
     server_name _;
     root /usr/share/nginx/html;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

3. **Build and deploy:**
   ```bash
   docker build -t gcr.io/267816589183/document-mismatch-detection-ui .
   docker push gcr.io/267816589183/document-mismatch-detection-ui
   
   gcloud run deploy document-mismatch-detection-ui \
     --image gcr.io/267816589183/document-mismatch-detection-ui \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 80
   ```

### Option 3: Deploy to Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Create netlify.toml:**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

## Update Frontend API URLs

After deploying the backend, update the frontend to use the deployed backend URL:

1. **Update `src/services/apiService.js`:**
   ```javascript
   const API_BASE_URL = "https://your-cloud-run-backend-url.run.app";
   ```

2. **Update `src/services/documentService.js`:**
   ```javascript
   const API_BASE_URL = "https://your-cloud-run-backend-url.run.app";
   ```

3. **Update all axios calls in pages** to use the new backend URL.

## Environment Variables

### Backend (Cloud Run)
Set these as environment variables in Cloud Run:
- `PROJECT_ID`
- `LOCATION`
- `PROCESSOR_ID`
- `GCS_BUCKET_NAME`
- `DB_HOST` (Cloud SQL connection name)
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

### Frontend
Create a `.env.production` file:
```env
VITE_API_BASE_URL=https://your-backend-url.run.app
```

Then update services to use:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
```

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Database initialized (run migrations or use init_db.py)
- [ ] GCS bucket created and accessible
- [ ] Document AI processor configured
- [ ] Frontend deployed and accessible
- [ ] Frontend API URLs updated
- [ ] CORS configured correctly
- [ ] Test document upload
- [ ] Test client dataset upload
- [ ] Test export functionality

## Quick Local Testing

If you want to test locally first:

```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
npm run dev
```

Then visit: http://localhost:5173

## Troubleshooting

### Backend Issues
- Check Cloud Run logs: `gcloud run services logs read document-mismatch-detection-api --region=us-central1`
- Verify environment variables are set correctly
- Check Cloud SQL connection string format

### Frontend Issues
- Check browser console for CORS errors
- Verify API base URL is correct
- Check network tab for failed requests

### Database Issues
- Ensure Cloud SQL instance is running
- Verify connection string format: `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`
- Check firewall rules allow Cloud Run access


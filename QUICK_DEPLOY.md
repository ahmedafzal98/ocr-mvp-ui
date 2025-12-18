# Quick Deployment Guide

## 🚀 Fastest Way to Deploy

### Backend (Cloud Run) - ~10 minutes

```bash
cd backend

# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project 267816589183

# 2. Enable required APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com

# 3. Deploy
./deploy.sh
```

**After deployment, you'll get a URL like:**
```
https://document-mismatch-detection-api-xxxxx-uc.a.run.app
```

**Save this URL!** You'll need it for the frontend.

### Frontend (Vercel) - ~5 minutes (Easiest)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd /path/to/ocr-mvp-ui
   vercel
   ```

3. **Set Environment Variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url.run.app`
   - Redeploy

**Or use Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

## 📋 Pre-Deployment Checklist

### Backend
- [ ] Google Cloud project set up
- [ ] Cloud SQL instance created (or use existing)
- [ ] GCS bucket exists: `personal-injury-document-bucket`
- [ ] Document AI processor configured
- [ ] Service account has proper permissions

### Frontend
- [ ] Backend deployed and URL obtained
- [ ] Environment variable set: `VITE_API_BASE_URL`
- [ ] CORS configured on backend (already done for development)

## 🔧 Manual Steps if Scripts Don't Work

### Backend Manual Deployment

```bash
cd backend

# Build
docker build -t gcr.io/267816589183/document-mismatch-detection-api .

# Push
docker push gcr.io/267816589183/document-mismatch-detection-api

# Deploy
gcloud run deploy document-mismatch-detection-api \
  --image gcr.io/267816589183/document-mismatch-detection-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "PROJECT_ID=267816589183,LOCATION=us,PROCESSOR_ID=3bd2a3a3becdadcb,GCS_BUCKET_NAME=personal-injury-document-bucket" \
  --memory 2Gi
```

### Frontend Manual Deployment (Vercel)

1. Push code to GitHub
2. Go to vercel.com
3. Import your repository
4. Add environment variable: `VITE_API_BASE_URL`
5. Deploy

## 🧪 Testing After Deployment

1. **Backend Health Check:**
   ```
   https://your-backend-url.run.app/health
   ```
   Should return: `{"status": "healthy"}`

2. **Frontend:**
   - Visit your deployed frontend URL
   - Try uploading a client dataset
   - Try uploading a document
   - Check document status
   - Export Excel report

## ⚠️ Common Issues

### CORS Errors
- Backend already configured for CORS
- If issues persist, check Cloud Run logs

### Database Connection
- Ensure Cloud SQL instance is running
- Use connection name format: `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`
- Check firewall rules

### Environment Variables
- Backend: Set in Cloud Run → Variables & Secrets
- Frontend: Set in Vercel/Netlify dashboard

## 📞 Need Help?

See `DEPLOYMENT.md` for detailed instructions.


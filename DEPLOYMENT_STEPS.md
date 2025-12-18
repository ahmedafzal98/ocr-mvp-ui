# Deployment Steps

## Backend Deployment (Cloud Run)

### Step 1: Prepare Environment

```bash
cd backend

# Set database environment variables (if needed)
export DB_HOST=your-db-host
export DB_PORT=5432
export DB_USER=your-db-user
export DB_PASSWORD=your-db-password
export DB_NAME=document_extraction_db
```

### Step 2: Deploy Backend

```bash
# Make sure you're authenticated with gcloud
gcloud auth login
gcloud config set project 267816589183

# Run deployment script
./deploy.sh
```

The script will output the deployed service URL, e.g.:
```
🎉 Backend deployed successfully!
📍 Service URL: https://document-mismatch-detection-api-xxxxx.run.app
```

### Step 3: Set Database Environment Variables (if not set during deploy)

After deployment, you can set DB environment variables via Cloud Run console:
1. Go to Cloud Run → Your Service → Edit & Deploy New Revision
2. Add environment variables:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`

Or via CLI:
```bash
gcloud run services update document-mismatch-detection-api \
  --region us-central1 \
  --update-env-vars "DB_HOST=your-host,DB_PORT=5432,DB_USER=your-user,DB_PASSWORD=your-password,DB_NAME=document_extraction_db"
```

## Frontend Deployment (Vercel)

### Step 1: Update Environment Variables

After backend is deployed, update frontend environment variables:

**Option A: Via Vercel Dashboard**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add:
   - `VITE_API_BASE_URL` = `https://your-backend-url.run.app`
   - `VITE_WS_BASE_URL` = `wss://your-backend-url.run.app`

**Option B: Via .env file (for local testing)**
Create `.env` file in project root:
```env
VITE_API_BASE_URL=https://your-backend-url.run.app
VITE_WS_BASE_URL=wss://your-backend-url.run.app
```

### Step 2: Push Changes to Git

```bash
git add .
git commit -m "Update frontend for production deployment"
git push
```

Vercel will automatically deploy on push.

### Step 3: Verify Deployment

1. Check backend health:
   ```bash
   curl https://your-backend-url.run.app/health
   ```

2. Check frontend is using correct backend URL:
   - Open browser console
   - Check network requests point to deployed backend

## Testing

1. **Backend Health Check:**
   ```bash
   curl https://your-backend-url.run.app/health
   ```
   Should return: `{"status": "healthy"}`

2. **Frontend:**
   - Visit your Vercel URL
   - Try uploading a document
   - Check that it connects to the deployed backend

## Troubleshooting

### Backend Issues

**Check logs:**
```bash
gcloud run services logs read document-mismatch-detection-api --region us-central1
```

**Common issues:**
- Database connection: Make sure DB env vars are set
- Google Cloud credentials: Service account needs proper permissions
- CORS errors: Backend allows all origins (`*`), should work

### Frontend Issues

**Check environment variables:**
- Make sure `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` are set in Vercel
- WebSocket URL must use `wss://` for HTTPS

**Check browser console:**
- Look for CORS errors
- Check WebSocket connection status
- Verify API requests go to correct URL

## Quick Reference

**Backend URL format:**
```
https://document-mismatch-detection-api-xxxxx.run.app
```

**WebSocket URL format:**
```
wss://document-mismatch-detection-api-xxxxx.run.app/ws/status
```

**API Endpoints:**
- Health: `GET /health`
- Upload Document: `POST /documents/upload`
- Upload Dataset: `POST /clients/upload`
- List Documents: `GET /documents/`
- Document Details: `GET /documents/{id}`
- Export: `GET /exports/{doc_id}`
- WebSocket: `WS /ws/status`


# ✅ Backend Ready for Deployment!

## Pre-Deployment Checklist

All code has been fixed and is ready for deployment:

✅ **Code Fixes:**
- WebSocket startup event added to `main.py`
- FastAPI and Uvicorn versions updated
- Dockerfile optimized
- `.dockerignore` created
- Deployment script ready
- No syntax errors

✅ **Prerequisites Verified:**
- ✅ gcloud CLI installed
- ✅ gcloud authenticated (ahmed.afzal2070@gmail.com)
- ✅ Project configured (elliptical-feat-476423-q8)
- ⚠️ Docker needs to be started

## Deployment Steps

### 1. Start Docker

**On macOS:**
- Open Docker Desktop application
- Wait for it to start (whale icon in menu bar)

**Verify Docker is running:**
```bash
docker ps
```

### 2. Set Database Environment Variables (Optional)

If you have a database ready, set these before deploying:
```bash
export DB_HOST=your-db-host
export DB_PORT=5432
export DB_USER=your-db-user
export DB_PASSWORD=your-db-password
export DB_NAME=document_extraction_db
```

**Note:** You can also set these via Cloud Run console after deployment.

### 3. Deploy Backend

```bash
cd backend
./deploy.sh
```

The script will:
1. Build Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Display the service URL

**Expected output:**
```
🎉 Backend deployed successfully!
📍 Service URL: https://document-mismatch-detection-api-xxxxx.run.app
```

### 4. Set Database Environment Variables (if not set during deploy)

After deployment, set DB variables via Cloud Run console:
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on your service: `document-mismatch-detection-api`
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add environment variables:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
6. Click "Deploy"

### 5. Test Backend

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe document-mismatch-detection-api --region=us-central1 --format='value(status.url)')

# Test health endpoint
curl ${SERVICE_URL}/health
```

Should return: `{"status": "healthy"}`

## Frontend Configuration

After backend is deployed, update frontend:

### Option 1: Vercel Dashboard (Recommended)

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://your-backend-url.run.app`
   - **Environment:** Production, Preview, Development
4. Add:
   - **Name:** `VITE_WS_BASE_URL`
   - **Value:** `wss://your-backend-url.run.app`
   - **Environment:** Production, Preview, Development
5. Redeploy your frontend

### Option 2: Local .env file

Create `.env` in project root:
```env
VITE_API_BASE_URL=https://your-backend-url.run.app
VITE_WS_BASE_URL=wss://your-backend-url.run.app
```

## Quick Deploy Command

If everything is ready, just run:

```bash
cd /Users/mbp/ocr-mvp-ui/backend
./deploy.sh
```

## Troubleshooting

### Docker Issues
- Make sure Docker Desktop is running
- Check: `docker ps` should work without errors

### Build Issues
- Check Docker has enough resources (Settings → Resources)
- Try: `docker system prune` to free space

### Deployment Issues
- Check gcloud is authenticated: `gcloud auth list`
- Check project is set: `gcloud config get-value project`
- Enable required APIs:
  ```bash
  gcloud services enable run.googleapis.com
  gcloud services enable containerregistry.googleapis.com
  ```

### Database Connection Issues
- Make sure DB environment variables are set
- Check database is accessible from Cloud Run
- For Cloud SQL, use connection string format

## Post-Deployment

1. **Test the API:**
   ```bash
   curl https://your-backend-url.run.app/health
   ```

2. **Check Logs:**
   ```bash
   gcloud run services logs read document-mismatch-detection-api --region us-central1
   ```

3. **Update Frontend:**
   - Set `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` in Vercel
   - Redeploy frontend

4. **Test Full Flow:**
   - Upload a document from frontend
   - Verify it processes correctly
   - Check real-time status updates work

## Files Modified

- ✅ `backend/main.py` - Added WebSocket startup event
- ✅ `backend/requirements.txt` - Updated FastAPI/Uvicorn versions
- ✅ `backend/Dockerfile` - Optimized for production
- ✅ `backend/.dockerignore` - Created to optimize build
- ✅ `backend/deploy.sh` - Updated deployment script

## Next Steps

1. **Start Docker Desktop**
2. **Run:** `cd backend && ./deploy.sh`
3. **Copy the deployed URL**
4. **Update frontend environment variables in Vercel**
5. **Test the deployed application**

Everything is ready! Just start Docker and run the deployment script! 🚀


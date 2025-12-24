# Backend Deployment Guide

This guide explains how to deploy the backend API to Google Cloud Run.

## Prerequisites

1. **Google Cloud SDK (gcloud CLI)** installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Docker** installed and running

3. **Required Environment Variables**:
   - `PROJECT_ID`: Your Google Cloud project ID
   - `JWT_SECRET_KEY`: Strong random secret for JWT tokens (required for production)
   - `CORS_ORIGINS`: Comma-separated list of allowed frontend URLs
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database connection details
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`: Admin credentials (optional, defaults provided)

## Quick Deployment

### Option 1: Using the deployment script (Recommended)

1. **Set required environment variables**:
   ```bash
   export PROJECT_ID="your-project-id"
   export JWT_SECRET_KEY="your-strong-random-secret-key"
   export CORS_ORIGINS="https://your-frontend-domain.com"
   export DB_HOST="your-db-host"
   export DB_PORT="5432"
   export DB_USER="your-db-user"
   export DB_PASSWORD="your-db-password"
   export DB_NAME="document_extraction_db"
   export ADMIN_USERNAME="admin"  # Optional
   export ADMIN_PASSWORD="secure-password"  # Optional
   ```

2. **Run the deployment script**:
   ```bash
   cd scripts
   chmod +x deploy-backend.sh
   ./deploy-backend.sh
   ```

### Option 2: Manual deployment

1. **Build and push Docker image**:
   ```bash
   cd backend
   docker build -t gcr.io/YOUR_PROJECT_ID/document-mismatch-detection-api:latest .
   docker push gcr.io/YOUR_PROJECT_ID/document-mismatch-detection-api:latest
   ```

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy document-mismatch-detection-api \
     --image gcr.io/YOUR_PROJECT_ID/document-mismatch-detection-api:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "ENVIRONMENT=production,PROJECT_ID=YOUR_PROJECT_ID,LOG_LEVEL=INFO,JWT_SECRET_KEY=YOUR_SECRET,CORS_ORIGINS=https://your-domain.com" \
     --memory 2Gi \
     --cpu 2 \
     --timeout 300 \
     --max-instances 10 \
     --port 8000
   ```

## Setting Environment Variables After Deployment

If you need to update environment variables after deployment:

### Using gcloud CLI:
```bash
gcloud run services update document-mismatch-detection-api \
  --region us-central1 \
  --update-env-vars "JWT_SECRET_KEY=new-secret,CORS_ORIGINS=https://new-domain.com"
```

### Using Cloud Console:
1. Go to Cloud Run in Google Cloud Console
2. Click on your service
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add or update environment variables
6. Click "Deploy"

## Setting Database Credentials

Use the helper script:
```bash
cd scripts
chmod +x set-database-env.sh
./set-database-env.sh
```

Or manually via gcloud:
```bash
gcloud run services update document-mismatch-detection-api \
  --region us-central1 \
  --update-env-vars "DB_HOST=your-host,DB_PORT=5432,DB_USER=user,DB_PASSWORD=pass,DB_NAME=dbname"
```

## Required Environment Variables

### Production Required:
- `ENVIRONMENT=production` - Enables production mode
- `JWT_SECRET_KEY` - Secret key for JWT tokens (use strong random string)
- `CORS_ORIGINS` - Comma-separated allowed origins (e.g., "https://app.example.com")

### Google Cloud Required:
- `PROJECT_ID` - Your Google Cloud project ID
- `LOCATION` - Document AI location (default: "us")
- `PROCESSOR_ID` - Document AI processor ID
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket name

### Database Required:
- `DB_HOST` - Database hostname or Cloud SQL connection name
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

### Optional:
- `ADMIN_USERNAME` - Admin username (default: "admin")
- `ADMIN_PASSWORD` - Admin password (default: "admin123")
- `LOG_LEVEL` - Logging level: DEBUG, INFO, WARNING, ERROR (default: INFO)

## Testing the Deployment

1. **Health Check**:
   ```bash
   curl https://YOUR-SERVICE-URL/health
   ```

2. **Database Health Check**:
   ```bash
   curl https://YOUR-SERVICE-URL/health/db
   ```

3. **View Logs**:
   ```bash
   gcloud run services logs read document-mismatch-detection-api --region us-central1 --limit 50
   ```

## Database Migration

If you need to run database migrations (like adding the `page_number` column):

1. **Connect to Cloud Run container**:
   ```bash
   gcloud run services proxy document-mismatch-detection-api --region us-central1 --port 8080
   ```

2. **Run migration manually** or update the database directly via Cloud SQL Admin.

Alternatively, migrations can be run locally against the production database:
```bash
cd backend
export DB_HOST=your-cloud-sql-connection-name
export DB_PASSWORD=your-password
python3 run_migration.py
```

## Troubleshooting

### Service fails to start
- Check logs: `gcloud run services logs read document-mismatch-detection-api --region us-central1`
- Verify all required environment variables are set
- Check database connectivity from Cloud Run

### CORS errors
- Verify `CORS_ORIGINS` environment variable includes your frontend URL
- Check that frontend is using correct API URL

### Database connection errors
- Verify Cloud SQL instance allows connections from Cloud Run
- Check database credentials are correct
- Ensure Cloud SQL Proxy or public IP is configured correctly

### Authentication errors
- Verify `JWT_SECRET_KEY` is set and matches across deployments
- Check token expiration settings

## Next Steps

After successful deployment:
1. Note your service URL (printed at end of deployment)
2. Update frontend `VITE_API_BASE_URL` with the service URL
3. Update frontend `VITE_WS_BASE_URL` for WebSocket connections
4. Test authentication and API endpoints
5. Monitor logs for any issues

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use Google Secret Manager** for sensitive values like `JWT_SECRET_KEY` and `DB_PASSWORD`
3. **Rotate secrets** regularly
4. **Restrict CORS origins** to only your frontend domain
5. **Use strong passwords** for admin credentials
6. **Enable Cloud Run authentication** if needed (currently set to unauthenticated)

## Using Secret Manager (Recommended)

For sensitive values, use Google Secret Manager:

1. **Create secrets**:
   ```bash
   echo -n "your-secret-value" | gcloud secrets create jwt-secret-key --data-file=-
   echo -n "your-db-password" | gcloud secrets create db-password --data-file=-
   ```

2. **Grant access** to Cloud Run service account:
   ```bash
   gcloud secrets add-iam-policy-binding jwt-secret-key \
     --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Reference in Cloud Run**:
   ```bash
   gcloud run services update document-mismatch-detection-api \
     --region us-central1 \
     --update-secrets "JWT_SECRET_KEY=jwt-secret-key:latest,DB_PASSWORD=db-password:latest"
   ```


# Quick Backend Deployment Checklist

## Before You Deploy

✅ **Prerequisites:**
- [ ] Google Cloud SDK (gcloud) installed and authenticated
- [ ] Docker installed and running
- [ ] Database is set up and accessible
- [ ] Google Cloud project ID ready

## Deployment Steps

### 1. Set Environment Variables

```bash
# Required
export PROJECT_ID="your-project-id"
export JWT_SECRET_KEY="$(openssl rand -hex 32)"  # Generate secure random key
export CORS_ORIGINS="https://your-frontend-domain.com"

# Database (if not using Cloud SQL)
export DB_HOST="your-database-host"
export DB_PORT="5432"
export DB_USER="your-db-user"
export DB_PASSWORD="your-db-password"
export DB_NAME="document_extraction_db"

# Optional
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="your-secure-password"
export LOG_LEVEL="INFO"
```

### 2. Deploy

```bash
cd scripts
./deploy-backend.sh
```

### 3. Set Database Credentials (if not set during deployment)

```bash
cd scripts
./set-database-env.sh
```

### 4. Test Deployment

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe document-mismatch-detection-api \
  --region us-central1 --format='value(status.url)')

# Test health check
curl ${SERVICE_URL}/health

# Test database connection
curl ${SERVICE_URL}/health/db
```

### 5. Update Frontend

Update your frontend environment variables:
```bash
VITE_API_BASE_URL=${SERVICE_URL}
VITE_WS_BASE_URL=${SERVICE_URL/https:/wss:}
```

## Quick Troubleshooting

**Service won't start?**
```bash
gcloud run services logs read document-mismatch-detection-api \
  --region us-central1 --limit 50
```

**Database connection issues?**
- Verify DB credentials in Cloud Run console
- Check Cloud SQL allows connections from Cloud Run
- Test with: `curl ${SERVICE_URL}/health/db`

**CORS errors?**
- Verify `CORS_ORIGINS` includes your frontend URL
- Check frontend is using correct API URL

## One-Line Deployment (After Setting Env Vars)

```bash
export PROJECT_ID="your-project-id" && \
export JWT_SECRET_KEY="$(openssl rand -hex 32)" && \
export CORS_ORIGINS="https://your-domain.com" && \
cd scripts && ./deploy-backend.sh
```


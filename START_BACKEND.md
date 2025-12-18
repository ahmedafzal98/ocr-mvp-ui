# Quick Start: Backend Server

## The Issue
Your upload request is pending because **the backend server is not running**.

## Quick Fix

### Option 1: Use the Start Script (Easiest)

```bash
cd backend
./start.sh
```

### Option 2: Manual Start

```bash
cd backend

# Create virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Create .env file if it doesn't exist
# Copy from your existing .env or create one with:
# PROJECT_ID=267816589183
# LOCATION=us
# PROCESSOR_ID=3bd2a3a3becdadcb
# GCS_BUCKET_NAME=personal-injury-document-bucket
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=Ahmed123!
# DB_NAME=document_extraction_db

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Verify Backend is Running

Once started, you should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Test it:
```bash
curl http://127.0.0.1:8000/health
```

Should return: `{"status":"healthy"}`

## Access API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Common Issues

### Port Already in Use
If port 8000 is already in use:
```bash
# Find what's using it
lsof -ti:8000

# Kill it (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port
uvicorn main:app --reload --host 0.0.0.0 --port 8001
# Then update frontend API_BASE_URL to use port 8001
```

### Database Connection Error
Make sure PostgreSQL is running:
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS)
brew services start postgresql

# Or check status
brew services list | grep postgresql
```

### Missing Dependencies
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Missing .env File
Create `.env` file in the `backend` directory with your configuration.

## After Starting Backend

1. Keep the terminal open (server runs in foreground)
2. Go back to your frontend
3. Try uploading again - it should work now!

## Running Both Frontend and Backend

**Terminal 1 (Backend):**
```bash
cd backend
./start.sh
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Then visit: http://localhost:5173


# Running Frontend and Backend Locally

## Quick Start

### 1. Start Backend

```bash
cd backend

# Install dependencies (if not already done)
pip install -r requirements.txt

# Set up environment variables
# Create .env file or export variables:
export DB_HOST=127.0.0.1  # or your Cloud SQL connection name
export DB_PORT=5432
export DB_USER=your_db_user
export DB_PASSWORD=your_db_password
export DB_NAME=document_extraction_db
export PROJECT_ID=your_project_id
export LOCATION=us
export PROCESSOR_ID=your_processor_id
export GCS_BUCKET_NAME=your_bucket_name
export JWT_SECRET_KEY=your_secret_key
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your_admin_password

# Run the backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://127.0.0.1:8000`

### 2. Start Frontend

Open a new terminal:

```bash
# Install dependencies (if not already done)
npm install

# Run the frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173` (or the port Vite assigns)

## Verify Everything Works

1. **Check Backend Health:**
   - Open: `http://127.0.0.1:8000/health`
   - Should return: `{"status": "healthy"}`

2. **Check Database Connection:**
   - Open: `http://127.0.0.1:8000/health/db`
   - Should return: `{"status": "healthy", "database": "connected"}`

3. **Check Frontend:**
   - Open: `http://localhost:5173`
   - Should see the login page

4. **Login:**
   - Use the credentials from your `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables

## Testing the New Features

1. **Upload a Document:**
   - Go to Upload page
   - Upload a PDF with dates
   - Wait for processing

2. **Check Mismatches:**
   - Go to Review Results
   - Click "View" on a processed document
   - Verify:
     - Page numbers appear in extracted fields
     - Mismatches section shows page numbers
     - Dates are in MM/DD/YYYY format

## Troubleshooting

### Backend Issues

**Database Connection Error:**
- Check your `.env` file or environment variables
- Verify database is running and accessible
- Test connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`

**Port Already in Use:**
- Change port: `uvicorn main:app --reload --host 0.0.0.0 --port 8001`
- Update frontend `.env`: `VITE_API_BASE_URL=http://127.0.0.1:8001`

### Frontend Issues

**Can't Connect to Backend:**
- Check `VITE_API_BASE_URL` in `.env` file
- Default: `http://127.0.0.1:8000`
- Make sure backend is running

**CORS Errors:**
- Backend CORS is configured to allow all origins in development
- If issues persist, check `main.py` CORS settings

## Environment Variables

### Backend (.env file in backend/ directory)

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=document_extraction_db
PROJECT_ID=your_project_id
LOCATION=us
PROCESSOR_ID=your_processor_id
GCS_BUCKET_NAME=your_bucket_name
JWT_SECRET_KEY=your_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
```

### Frontend (.env file in root directory)

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Next Steps

After running locally:
1. Test document upload
2. Verify date extraction (check various date formats)
3. Check mismatch detection with page numbers
4. Verify date format is MM/DD/YYYY

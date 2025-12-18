# Quick Start Guide

## Prerequisites Check

1. **Python 3.11+** installed
2. **PostgreSQL** running and accessible
3. **Google Cloud Project** with:
   - Document AI API enabled
   - Cloud Storage bucket created
   - Service account key downloaded

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory:

```env
PROJECT_ID=267816589183
LOCATION=us
PROCESSOR_ID=3bd2a3a3becdadcb

GCS_BUCKET_NAME=personal-injury-document-bucket

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=Ahmed123!
DB_NAME=document_extraction_db

API_HOST=0.0.0.0
DEBUG=True
```

### 3. Set Google Cloud Credentials

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

### 4. Initialize Database

```bash
# Create database
createdb document_extraction_db

# Initialize tables (automatic on first run, or use):
python init_db.py
```

### 5. Start the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Testing the API

### 1. Upload Client Dataset

```bash
curl -X POST "http://localhost:8000/clients/upload" \
  -F "file=@client_dataset.csv"
```

**Example client_dataset.csv:**
```csv
name,dob,doa
John Doe,1980-01-15,2023-05-20
Jane Smith,1975-03-22,2023-06-10
```

### 2. Upload a Document

```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -F "file=@medical_document.pdf"
```

**Response:**
```json
{
  "id": 1,
  "filename": "medical_document.pdf",
  "status": "pending",
  "message": "Document uploaded successfully. Processing in background."
}
```

### 3. Check Document Status

```bash
curl "http://localhost:8000/documents/1/status"
```

**Response:**
```json
{
  "id": 1,
  "filename": "medical_document.pdf",
  "status": "completed",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:05:00"
}
```

### 4. Get Excel Export

```bash
curl "http://localhost:8000/exports/1"
```

**Response:**
```json
{
  "export_id": 1,
  "gcs_uri": "gs://bucket/exports/report_1.xlsx",
  "signed_url": "https://storage.googleapis.com/...",
  "expires_at": "2024-01-01T13:00:00"
}
```

Download the Excel file using the `signed_url`.

## Using the API Documentation

Visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check connection string in `.env`
- Ensure database exists: `psql -l | grep document_extraction_db`

### Google Cloud Issues

- Verify service account key path: `echo $GOOGLE_APPLICATION_CREDENTIALS`
- Check API is enabled: `gcloud services list --enabled | grep documentai`
- Verify bucket exists: `gsutil ls gs://personal-injury-document-bucket`

### Document Processing Fails

- Check document status: `GET /documents/{id}/status`
- Verify Document AI processor ID is correct
- Check GCS bucket permissions
- Review server logs for detailed error messages

## Next Steps

- Review the main README.md for detailed documentation
- Check database schema in `database/schema.sql`
- Explore the code structure in `services/` and `routes/`


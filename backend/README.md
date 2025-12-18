# Medical/Billing Document Date Mismatch Detection System - MVP

A production-ready MVP system for detecting date mismatches in medical/billing documents using OCR and fuzzy matching.

## Features

- **Document Upload**: Accepts PDF, JPG, PNG, TIFF files
- **OCR Processing**: Uses Google Document AI to extract text and entities
- **Data Extraction**: Extracts Patient Name, DoB, DoA, and Service Dates
- **Client Matching**: Fuzzy name matching against client dataset
- **Mismatch Detection**: Flags DoB and DoA mismatches
- **Excel Export**: Generates downloadable Excel reports

## Tech Stack

- **Backend**: Python 3.11 + FastAPI
- **OCR**: Google Document AI
- **Storage**: Google Cloud Storage
- **Database**: PostgreSQL (Cloud SQL compatible)
- **Export**: pandas + openpyxl
- **Deployment**: Cloud Run ready

## Project Structure

```
backend/
├── database/
│   ├── __init__.py
│   ├── connection.py      # Database connection and session management
│   ├── models.py          # SQLAlchemy models
│   └── schema.sql         # SQL schema
├── services/
│   ├── __init__.py
│   ├── ocr_service.py     # Google Document AI integration
│   ├── extraction_service.py  # Field extraction from OCR
│   ├── matching_service.py    # Fuzzy name matching
│   └── export_service.py      # Excel report generation
├── routes/
│   ├── __init__.py
│   ├── documents.py       # Document upload and status endpoints
│   ├── clients.py         # Client dataset upload
│   └── exports.py         # Export generation endpoints
├── main.py                # FastAPI application
├── requirements.txt       # Python dependencies
├── Dockerfile             # Cloud Run deployment
└── README.md
```

## Setup

### Prerequisites

1. Python 3.11+
2. PostgreSQL database
3. Google Cloud Project with:
   - Document AI API enabled
   - Cloud Storage bucket created
   - Service account with appropriate permissions

### Local Development

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the `backend` directory with:
   ```env
   PROJECT_ID=your-project-id
   LOCATION=us
   PROCESSOR_ID=your-processor-id
   GCS_BUCKET_NAME=your-bucket-name
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your-password
   DB_NAME=document_extraction_db
   ```

5. **Set up Google Cloud credentials:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
   ```

6. **Create database:**
   ```bash
   createdb document_extraction_db
   ```

7. **Initialize database schema:**
   ```bash
   psql -d document_extraction_db -f database/schema.sql
   ```
   Or use SQLAlchemy to create tables automatically (they're created on first run).

8. **Run the application:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

9. **Access API documentation:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### 1. Upload Document
```http
POST /documents/upload
Content-Type: multipart/form-data

Body: file (PDF, JPG, PNG, TIFF)
```

**Response:**
```json
{
  "id": 1,
  "filename": "document.pdf",
  "status": "pending",
  "message": "Document uploaded successfully. Processing in background."
}
```

### 2. Upload Client Dataset
```http
POST /clients/upload
Content-Type: multipart/form-data

Body: file (CSV or XLSX)
```

**Expected CSV/XLSX columns:**
- `name` (required)
- `dob` (optional)
- `doa` (optional)

**Response:**
```json
{
  "message": "Successfully uploaded 10 client profiles",
  "total_rows": 10,
  "inserted": 10
}
```

### 3. Get Document Status
```http
GET /documents/{id}/status
```

**Response:**
```json
{
  "id": 1,
  "filename": "document.pdf",
  "status": "completed",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:05:00"
}
```

**Status values:** `pending`, `processing`, `completed`, `failed`

### 4. Get Export
```http
GET /exports/{doc_id}
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

## Database Schema

### Tables

- **client_profiles**: Client information (name, dob, doa)
- **documents**: Uploaded documents metadata
- **extracted_fields**: OCR extracted fields with confidence scores
- **matches**: Document-to-client matches with scores
- **mismatches**: Detected date mismatches
- **exports**: Generated Excel report records

See `database/schema.sql` for full schema definition.

## Deployment to Cloud Run

1. **Build Docker image:**
   ```bash
   docker build -t gcr.io/PROJECT_ID/document-mismatch-detection .
   ```

2. **Push to Google Container Registry:**
   ```bash
   docker push gcr.io/PROJECT_ID/document-mismatch-detection
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy document-mismatch-detection \
     --image gcr.io/PROJECT_ID/document-mismatch-detection \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "PROJECT_ID=...,DB_HOST=...,DB_PASSWORD=..."
   ```

   Or use Cloud Run's environment variable configuration in the console.

## Configuration

### Google Document AI Setup

1. Create a Document AI processor in Google Cloud Console
2. Note the Processor ID
3. Ensure the service account has `Document AI API User` role

### Cloud Storage Setup

1. Create a GCS bucket
2. Ensure the service account has `Storage Object Admin` role
3. Configure bucket for signed URLs if needed

### Database Setup

- For Cloud SQL, use the Cloud SQL Proxy or connection string
- Update `DB_HOST` to your Cloud SQL instance connection name
- Ensure the service account has Cloud SQL Client role

## Error Handling

The system handles errors gracefully:
- Invalid file types return 400 errors
- Processing failures update document status to `failed`
- Database errors are rolled back
- GCS upload failures are caught and reported

## Limitations (MVP)

- No authentication/authorization (add JWT middleware for production)
- No batch processing UI
- No real-time notifications
- Single document processing at a time
- No retry logic for failed OCR operations

## Future Enhancements

- Add JWT authentication
- Implement batch document processing
- Add webhook notifications
- Implement retry logic with exponential backoff
- Add more sophisticated date parsing
- Support for additional document types
- Multi-tenant support

## License

MIT


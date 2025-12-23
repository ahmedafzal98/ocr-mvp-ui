# Backend Codebase Learning Path
## Step-by-Step Guide for Understanding Your Production System

> **Note:** You mentioned Pub/Sub, but your current codebase uses **FastAPI BackgroundTasks**. I'll explain what you have, and note where Pub/Sub would fit if you migrate later.

---

## 🎯 Learning Order: What to Understand First

### STEP 1: Start Here - The Entry Point (`main.py`)
**File:** `backend/main.py` (105 lines)

**WHY FIRST:**
- This is where your application starts
- Shows how all pieces connect
- Simplest file (just setup code)

**WHAT IT DOES:**
1. Creates FastAPI app
2. Connects all routers (endpoints)
3. Sets up database tables
4. Starts WebSocket message queue processor

**KEY LINES TO UNDERSTAND:**
```python
# Line 25-29: Creates the FastAPI app
app = FastAPI(title="...", version="1.0.0")

# Line 42-49: Connects all your API endpoints
app.include_router(auth_router)      # Login endpoint
app.include_router(documents_router) # Upload, list, status endpoints
app.include_router(clients_router)   # Client dataset upload
app.include_router(exports_router)   # Excel export generation
app.include_router(matches_router)   # Match results
app.include_router(stats_router)     # Statistics
app.include_router(websocket_router) # Real-time updates

# Line 52-55: Starts background task on server startup
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(process_message_queue())
```

**WHAT PROBLEM IT SOLVES:**
- Without this, you have no API endpoints
- Without routers, frontend can't call your backend
- Without startup event, WebSocket updates don't work

**HOW IT CONNECTS TO NEXT STEP:**
- Routers define endpoints → Next, understand what happens when endpoint is called

**⏱️ Time:** 15 minutes to read and understand

---

### STEP 2: Authentication Flow (`auth.py` + `routes/auth.py`)
**Files:** 
- `backend/auth.py` (114 lines) - Core auth logic
- `backend/routes/auth.py` (66 lines) - Login endpoint

**WHY SECOND:**
- Every protected endpoint requires authentication
- Understanding auth explains why some requests fail with 401
- Simple flow: login → get token → use token

**WHAT IT DOES:**
1. User logs in → `POST /auth/login` (routes/auth.py)
2. Backend checks username/password → `authenticate_user()` (auth.py line 61)
3. If valid → Creates JWT token → `create_access_token()` (auth.py line 40)
4. Frontend stores token
5. Frontend sends token in header → `Authorization: Bearer <token>`
6. Protected endpoints verify token → `get_current_user()` (auth.py line 68)

**KEY CODE TO TRACE:**
```python
# routes/auth.py line 30-56: Login endpoint
@router.post("/login")
async def login(login_data: LoginRequest):
    # Step 1: Check credentials
    if not authenticate_user(login_data.username, login_data.password):
        raise HTTPException(401, "Incorrect username or password")
    
    # Step 2: Create token (expires in 24 hours)
    access_token = create_access_token(data={"sub": login_data.username})
    return {"access_token": token, "token_type": "bearer"}

# auth.py line 68-93: Token verification (used by ALL protected endpoints)
async def get_current_user(credentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)  # Decodes and verifies token
    if payload is None:
        raise HTTPException(401, "Invalid token")
    return {"username": payload.get("sub")}
```

**WHAT PROBLEM IT SOLVES:**
- Without auth: Anyone can upload documents (security risk)
- Without JWT: Can't track who uploaded what
- Without token verification: Protected endpoints would be accessible to anyone

**HOW IT CONNECTS TO NEXT STEP:**
- Protected endpoints use `Depends(get_current_user)` → Next, see how this protects document upload

**⏱️ Time:** 30 minutes to read and trace the flow

**PRACTICE:**
1. Call `POST /auth/login` with wrong password → See 401 error
2. Call with correct password → Get token
3. Call `GET /documents/` without token → See 401 error
4. Call `GET /documents/` with token → See list of documents

---

### STEP 3: Database Connection & Models
**Files:**
- `backend/database/connection.py` (63 lines) - How to connect
- `backend/database/models.py` (112 lines) - What data looks like

**WHY THIRD:**
- Every endpoint reads/writes to database
- Models show your data structure
- Connection code shows how database is accessed

**WHAT IT DOES:**

**connection.py:**
1. Reads database credentials from environment variables
2. Creates database connection (SQLAlchemy engine)
3. Creates session factory (reuses connections)
4. Provides `get_db()` function (used by all endpoints)

**KEY CODE:**
```python
# connection.py line 46-50: Creates database engine
engine = create_engine(
    db_settings.database_url,  # postgresql://user:pass@host:port/dbname
    pool_pre_ping=True,  # Checks connection before using
    echo=False  # Set True to see SQL queries in logs
)

# connection.py line 56-62: Dependency used by endpoints
def get_db():
    db = SessionLocal()  # Creates new database session
    try:
        yield db  # Gives session to endpoint
    finally:
        db.close()  # Always closes session (even if error)
```

**models.py:**
- Defines 6 tables: `ClientProfile`, `Document`, `ExtractedField`, `Match`, `Mismatch`, `Export`
- Shows relationships (Document has many ExtractedFields)

**KEY TABLES:**
```python
# models.py line 25-41: Document table (most important)
class Document(Base):
    id = Column(Integer, primary_key=True)
    filename = Column(String(255))
    gcs_uri = Column(String(512))  # Where file is stored
    status = Column(String(50))  # 'pending', 'processing', 'completed', 'failed'
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    
    # Relationships (one document has many...)
    extracted_fields = relationship("ExtractedField", ...)
    matches = relationship("Match", ...)
    mismatches = relationship("Mismatch", ...)
```

**WHAT PROBLEM IT SOLVES:**
- Without connection: Can't save/read data
- Without models: Don't know what data structure is
- Without sessions: Database connections would leak (crash server)

**HOW IT CONNECTS TO NEXT STEP:**
- Endpoints use `db: Session = Depends(get_db)` → Next, see how endpoints use database

**⏱️ Time:** 45 minutes to read models and understand relationships

**PRACTICE:**
1. Look at `database/models.py` - understand each table
2. Check `database/schema.sql` - see actual SQL (if exists)
3. Connect to database: `psql -h <host> -U <user> -d document_extraction_db`
4. Run: `SELECT * FROM documents;` to see actual data

---

### STEP 4: Document Upload Endpoint (The Main Flow)
**File:** `backend/routes/documents.py` (459 lines)

**WHY FOURTH:**
- This is your core feature
- Shows complete request → response flow
- Demonstrates async processing pattern

**WHAT IT DOES - LINE BY LINE:**

**Upload Endpoint (lines 38-122):**
```python
@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,  # For async processing
    file: UploadFile = File(...),      # The uploaded file
    db: Session = Depends(get_db),     # Database session
    current_user: dict = Depends(get_current_user)  # Auth check
):
    # Step 1: Validate file type (lines 50-58)
    if file_ext not in allowed_extensions:
        raise HTTPException(400, "Unsupported file type")
    
    # Step 2: Read file into memory (line 61)
    file_content = await file.read()
    
    # Step 3: Upload to GCS (lines 79-88)
    gcs_uri = ocr_service.upload_to_gcs(file_content, file.filename)
    # Returns: "gs://bucket-name/documents/filename.pdf"
    
    # Step 4: Save to database (lines 90-99)
    document = Document(filename=file.filename, gcs_uri=gcs_uri, status='pending')
    db.add(document)
    db.commit()  # WRITES TO DATABASE HERE
    # Now document.id exists (e.g., 123)
    
    # Step 5: Start background processing (lines 101-104)
    background_tasks.add_task(process_document_task, document.id, gcs_uri, mime_type)
    # ⚠️ IMPORTANT: This runs AFTER response is sent
    
    # Step 6: Return immediately (lines 106-112)
    return {
        "id": document.id,
        "status": "pending",  # Still pending, processing hasn't started
        "message": "Document uploaded successfully. Processing in background."
    }
    # ⚠️ HTTP REQUEST ENDS HERE - User gets response
    # Processing happens in background (separate thread)
```

**Background Task (lines 125-295):**
```python
def process_document_task(doc_id: int, gcs_uri: str, mime_type: str):
    # This runs AFTER upload endpoint returns response
    
    # Step 1: Get new database session (line 154)
    db = SessionLocal()  # New session (can't reuse old one)
    
    # Step 2: Update status to 'processing' (lines 157-165)
    document = db.query(Document).filter(Document.id == doc_id).first()
    document.status = 'processing'
    db.commit()  # WRITES STATUS CHANGE TO DATABASE
    
    # Step 3: Send WebSocket update (lines 167-173)
    broadcast_status_update_sync(doc_id, 'processing', 'Processing document...')
    
    # Step 4: Run OCR (lines 175-191)
    ocr_result = ocr_service.process_document_from_gcs(gcs_uri)
    # Calls Google Document AI API
    # Returns: {full_text: "...", entities: {...}, success: True}
    
    # Step 5: Extract fields (lines 210-244)
    extracted_fields = extraction_service.extract_fields(ocr_result)
    # Saves to ExtractedField table
    db.commit()  # WRITES EXTRACTED FIELDS TO DATABASE
    
    # Step 6: Match client (lines 253-258)
    matched_client_id, match_score, decision = matching_service.match_document(...)
    # Saves to Match table
    db.commit()  # WRITES MATCH TO DATABASE
    
    # Step 7: Detect mismatches (lines 260-266)
    mismatches = matching_service.detect_mismatches(...)
    # Saves to Mismatch table
    db.commit()  # WRITES MISMATCHES TO DATABASE
    
    # Step 8: Mark complete (lines 268-278)
    document.status = 'completed'
    db.commit()  # WRITES FINAL STATUS TO DATABASE
    broadcast_status_update_sync(doc_id, 'completed', 'Document processed successfully')
```

**WHAT PROBLEM IT SOLVES:**
- Without async: User waits 2-5 minutes for OCR (bad UX)
- Without background task: Request times out
- Without status updates: User doesn't know progress

**HOW IT CONNECTS TO NEXT STEP:**
- Background task calls services → Next, understand what each service does

**⏱️ Time:** 1-2 hours to fully understand the flow

**KEY INSIGHTS:**
1. **Upload returns immediately** - Processing happens after
2. **Status changes:** `pending` → `processing` → `completed` (or `failed`)
3. **Database writes happen at:** upload, status change, field extraction, matching, completion
4. **Failures:** If any step fails, status becomes `failed`, error logged

---

### STEP 5: Service Layer (Business Logic)
**Files:**
- `backend/services/ocr_service.py` (256 lines) - Google Document AI
- `backend/services/extraction_service.py` (425 lines) - Field extraction
- `backend/services/matching_service.py` (175 lines) - Client matching
- `backend/services/export_service.py` (487 lines) - Excel generation

**WHY FIFTH:**
- These contain your business logic
- Understand what each service does
- See how data flows: OCR → Extraction → Matching

**WHAT EACH SERVICE DOES:**

#### OCR Service (`ocr_service.py`)
**Purpose:** Converts PDF/image to text using Google Document AI

**Key Methods:**
```python
# Line 38-65: Uploads file to GCS
def upload_to_gcs(file_content: bytes, filename: str) -> str:
    bucket = storage_client.bucket("personal-injury-document-bucket")
    blob = bucket.blob(f"documents/{filename}")
    blob.upload_from_string(file_content)
    return f"gs://bucket-name/documents/{filename}"

# Line 190-254: Processes document from GCS
def process_document_from_gcs(gcs_uri: str) -> Dict:
    # Downloads file from GCS
    file_content = blob.download_as_bytes()
    
    # Calls Document AI API
    result = client.process_document(request)
    
    # Returns:
    return {
        'full_text': "All text from document",
        'entities': {
            'date_of_birth': {'value': '01/15/1980', 'confidence': 0.95},
            'person_name': {'value': 'John Doe', 'confidence': 0.92}
        },
        'success': True
    }
```

**What breaks if removed:** No text extraction, system can't read documents

---

#### Extraction Service (`extraction_service.py`)
**Purpose:** Extracts structured fields (name, DoB, DoA) from OCR text

**Key Method:**
```python
# Line 30-143: Extracts fields from OCR result
def extract_fields(self, ocr_result: Dict) -> Dict:
    # Priority 1: Use Document AI entities (most reliable)
    if entities:
        # Maps entity types to field names
        # 'date_of_birth' → 'dob'
        # 'person_name' → 'patient_name'
    
    # Priority 2: Fallback to regex patterns
    if 'patient_name' not in extracted:
        name_data = self._extract_name(full_text)
    
    # Returns:
    return {
        'patient_name': {
            'raw_value': 'John Doe',
            'normalized_value': 'john doe',
            'confidence': 0.92
        },
        'dob': {
            'raw_value': '01/15/1980',
            'normalized_value': '1980-01-15',
            'confidence': 0.95
        }
    }
```

**What breaks if removed:** Can't extract structured data, matching won't work

---

#### Matching Service (`matching_service.py`)
**Purpose:** Matches document to client profile using fuzzy name matching

**Key Methods:**
```python
# Line 20-90: Matches document to client
def match_document(self, db, doc_id, extracted_fields):
    # Gets extracted name
    extracted_name = extracted_fields['patient_name']['normalized_value']
    
    # Gets all clients from database
    clients = db.query(ClientProfile).all()
    
    # Calculates similarity score for each client
    for client in clients:
        score = fuzz.WRatio(extracted_name, client.name)  # 0-100
    
    # Returns best match
    return (matched_client_id, match_score, decision)
    # decision: 'match', 'ambiguous', or 'no_match'

# Line 92-161: Detects date mismatches
def detect_mismatches(self, db, doc_id, client_id, extracted_fields):
    # Compares extracted DoB/DoA with client's expected values
    # If different → Creates Mismatch record
    return mismatches  # List of mismatches found
```

**What breaks if removed:** Can't match documents to clients, can't detect mismatches

---

#### Export Service (`export_service.py`)
**Purpose:** Generates Excel reports with all document data

**Key Method:**
```python
# Line 38-295: Generates Excel report
def generate_excel_report(self, db, doc_id):
    # Gets all data: document, extracted_fields, matches, mismatches
    # Creates Excel file with pandas
    # Uploads to GCS
    # Generates signed URL (temporary download link)
    return {
        'signed_url': 'https://storage.googleapis.com/...',
        'expires_at': '2024-01-02T12:00:00'
    }
```

**What breaks if removed:** Can't generate Excel exports

**⏱️ Time:** 2-3 hours to understand all services

**PRACTICE:**
1. Trace data flow: OCR result → Extraction → Matching
2. Add logging to see what each service returns
3. Test with a sample document

---

### STEP 6: Other Endpoints (Supporting Features)
**Files:**
- `backend/routes/clients.py` - Upload client dataset
- `backend/routes/exports.py` - Generate/download exports
- `backend/routes/matches.py` - Get match results
- `backend/routes/stats.py` - Statistics
- `backend/routes/websocket.py` - Real-time updates

**WHY SIXTH:**
- These are simpler than document upload
- Show different patterns (file upload, data retrieval, WebSockets)
- Complete your understanding of the API

**QUICK OVERVIEW:**

**clients.py:** Uploads CSV/Excel with client data → Saves to `client_profiles` table

**exports.py:** Generates Excel report → Calls `export_service.generate_excel_report()`

**matches.py:** Returns match results for a document → Queries `Match` table

**stats.py:** Returns statistics → Aggregates data from multiple tables

**websocket.py:** Real-time status updates → Frontend connects, receives status changes

**⏱️ Time:** 1 hour to skim and understand each

---

## 🔄 Complete Execution Flow (Simple Language)

### Scenario: User uploads a medical document PDF

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND REQUEST                                         │
└─────────────────────────────────────────────────────────────┘
User clicks "Upload" → Frontend sends:
  POST /documents/upload
  Headers: Authorization: Bearer <jwt_token>
  Body: file (PDF, multipart/form-data)

┌─────────────────────────────────────────────────────────────┐
│ 2. AUTHENTICATION CHECK                                     │
└─────────────────────────────────────────────────────────────┘
FastAPI receives request → Calls get_current_user()
  → Extracts token from Authorization header
  → Verifies token (checks signature, expiration)
  → If valid: Returns user info
  → If invalid: Returns 401 Unauthorized (STOPS HERE)

┌─────────────────────────────────────────────────────────────┐
│ 3. FILE VALIDATION                                          │
└─────────────────────────────────────────────────────────────┘
routes/documents.py → upload_document()
  → Checks file extension (.pdf, .jpg, etc.)
  → If invalid: Returns 400 Bad Request (STOPS HERE)
  → If valid: Reads file into memory

┌─────────────────────────────────────────────────────────────┐
│ 4. UPLOAD TO CLOUD STORAGE                                  │
└─────────────────────────────────────────────────────────────┘
ocr_service.upload_to_gcs()
  → Connects to Google Cloud Storage
  → Uploads file to: gs://bucket/documents/filename.pdf
  → Returns GCS URI: "gs://bucket/documents/filename.pdf"
  → If fails: Returns 500 error (STOPS HERE)

┌─────────────────────────────────────────────────────────────┐
│ 5. CREATE DATABASE RECORD                                   │
└─────────────────────────────────────────────────────────────┘
routes/documents.py → upload_document()
  → Creates Document object:
     - filename: "document.pdf"
     - gcs_uri: "gs://bucket/documents/document.pdf"
     - status: "pending"
  → db.add(document)
  → db.commit()  ← WRITES TO DATABASE
  → Gets document.id (e.g., 123)

┌─────────────────────────────────────────────────────────────┐
│ 6. START BACKGROUND TASK                                    │
└─────────────────────────────────────────────────────────────┘
background_tasks.add_task(process_document_task, 123, gcs_uri, mime_type)
  → Adds task to queue
  → Task will run AFTER response is sent

┌─────────────────────────────────────────────────────────────┐
│ 7. RETURN RESPONSE (HTTP REQUEST ENDS)                      │
└─────────────────────────────────────────────────────────────┘
Returns to frontend:
  {
    "id": 123,
    "status": "pending",
    "message": "Document uploaded successfully. Processing in background."
  }
  ← USER GETS RESPONSE IMMEDIATELY
  ← Processing hasn't started yet!

┌─────────────────────────────────────────────────────────────┐
│ 8. BACKGROUND PROCESSING STARTS (Separate Thread)           │
└─────────────────────────────────────────────────────────────┘
process_document_task(doc_id=123, gcs_uri="...", mime_type="...")

  ┌──────────────────────────────────────────────────────┐
  │ 8a. Update Status to 'processing'                    │
  └──────────────────────────────────────────────────────┘
  → Gets new database session
  → Updates document.status = 'processing'
  → db.commit()  ← WRITES STATUS CHANGE TO DATABASE
  → Sends WebSocket message: "Document 123 is processing..."

  ┌──────────────────────────────────────────────────────┐
  │ 8b. Run OCR (Google Document AI)                    │
  └──────────────────────────────────────────────────────┘
  → ocr_service.process_document_from_gcs(gcs_uri)
  → Downloads file from GCS
  → Calls Google Document AI API
  → Returns: {full_text: "...", entities: {...}}
  → If fails: Status = 'failed', STOPS HERE

  ┌──────────────────────────────────────────────────────┐
  │ 8c. Extract Fields                                    │
  └──────────────────────────────────────────────────────┘
  → extraction_service.extract_fields(ocr_result)
  → Extracts: patient_name, dob, doa, referral
  → Saves to ExtractedField table
  → db.commit()  ← WRITES EXTRACTED FIELDS TO DATABASE

  ┌──────────────────────────────────────────────────────┐
  │ 8d. Match Client                                      │
  └──────────────────────────────────────────────────────┘
  → matching_service.match_document(db, doc_id, extracted_fields)
  → Gets all clients from database
  → Fuzzy matches name (Jaro-Winkler similarity)
  → Saves to Match table
  → db.commit()  ← WRITES MATCH TO DATABASE

  ┌──────────────────────────────────────────────────────┐
  │ 8e. Detect Mismatches                                 │
  └──────────────────────────────────────────────────────┘
  → matching_service.detect_mismatches(...)
  → Compares extracted DoB/DoA with client's expected values
  → If different: Creates Mismatch record
  → db.commit()  ← WRITES MISMATCHES TO DATABASE

  ┌──────────────────────────────────────────────────────┐
  │ 8f. Mark Complete                                     │
  └──────────────────────────────────────────────────────┘
  → document.status = 'completed'
  → db.commit()  ← WRITES FINAL STATUS TO DATABASE
  → Sends WebSocket message: "Document 123 completed!"

┌─────────────────────────────────────────────────────────────┐
│ 9. FRONTEND RECEIVES UPDATES                                │
└─────────────────────────────────────────────────────────────┘
Frontend WebSocket connection:
  → Receives: {"doc_id": 123, "status": "processing", ...}
  → Updates UI: Shows "Processing..." badge
  → Receives: {"doc_id": 123, "status": "completed", ...}
  → Updates UI: Shows "Completed" badge, enables "View Results" button

┌─────────────────────────────────────────────────────────────┐
│ 10. USER VIEWS RESULTS                                      │
└─────────────────────────────────────────────────────────────┘
User clicks "View Results" → Frontend calls:
  GET /documents/123/extracted-fields
  GET /matches/123
  → Backend queries database
  → Returns extracted fields, match results, mismatches
  → Frontend displays data
```

---

## 🎯 Key Points About Async Behavior

### Where Async Happens:

1. **File Upload (line 61):** `file_content = await file.read()`
   - Reads file asynchronously (doesn't block)

2. **Background Task (line 103):** `background_tasks.add_task(...)`
   - Task runs AFTER HTTP response is sent
   - Runs in separate thread (not async, but non-blocking)

3. **WebSocket (websocket.py):** `async def websocket_endpoint(...)`
   - Real-time updates use async WebSocket

### Where Data is Written to DB:

1. **Upload (line 97):** `db.commit()` - Creates document record
2. **Status Update (line 164):** `db.commit()` - Changes status to 'processing'
3. **Extracted Fields (line 243):** `db.commit()` - Saves extracted fields
4. **Match (line 88 in matching_service):** `db.commit()` - Saves match result
5. **Mismatches (line 160 in matching_service):** `db.commit()` - Saves mismatches
6. **Completion (line 270):** `db.commit()` - Changes status to 'completed'

### Status Changes:

```
pending → processing → completed
   ↓         ↓            ↓
Upload   OCR starts   All done
         ↓
      failed (if error)
```

**Status locations:**
- `pending`: Set at upload (line 94)
- `processing`: Set in background task (line 163)
- `completed`: Set at end (line 269)
- `failed`: Set if error (line 184, 287)

### Where Failures Can Occur:

1. **Authentication (auth.py line 78):** Invalid/expired token → 401
2. **File Validation (documents.py line 54):** Wrong file type → 400
3. **GCS Upload (documents.py line 82):** Network/permission error → 500
4. **Database Write (documents.py line 97):** Connection error → 500, rollback
5. **OCR Processing (documents.py line 178):** Document AI API error → Status = 'failed'
6. **Field Extraction (documents.py line 212):** No fields found → Continues (warns)
7. **Matching (documents.py line 255):** No clients in DB → Returns 'no_match'

**Error Handling:**
- Try/except blocks catch errors
- Database rollback on failure (line 121)
- Status set to 'failed' (line 184, 287)
- Error logged (line 119, 281)
- WebSocket notification sent (line 188, 290)

---

## 📁 File Prioritization

### 🔴 MUST UNDERSTAND (Core Files)

1. **`main.py`** - Application entry point
2. **`auth.py`** - Authentication logic
3. **`routes/documents.py`** - Main upload/processing flow
4. **`database/connection.py`** - Database setup
5. **`database/models.py`** - Data structure
6. **`services/ocr_service.py`** - OCR processing
7. **`services/extraction_service.py`** - Field extraction
8. **`services/matching_service.py`** - Client matching

### 🟡 SHOULD UNDERSTAND (Important but Secondary)

9. **`routes/auth.py`** - Login endpoint
10. **`routes/websocket.py`** - Real-time updates
11. **`routes/exports.py`** - Export generation
12. **`services/export_service.py`** - Excel generation
13. **`routes/clients.py`** - Client dataset upload

### 🟢 CAN IGNORE FOR NOW (Supporting Files)

14. **`routes/matches.py`** - Simple data retrieval
15. **`routes/stats.py`** - Simple aggregation
16. **`init_db.py`** - Database initialization (one-time setup)
17. **`database/schema.sql`** - SQL schema (models.py is source of truth)
18. **All `.md` files** - Documentation (read when needed)

### ⚪ CONFIG/INFRA (Reference Only)

19. **`Dockerfile`** - Container definition
20. **`requirements.txt`** - Dependencies
21. **`deploy.sh`** - Deployment script
22. **`.env` files** - Environment variables (don't commit!)

---

## 🎓 Recommended Study Path

### Day 1-2: Foundation (Read & Understand)

**Morning (3 hours):**
1. Read `main.py` - Understand app structure
2. Read `auth.py` - Understand authentication
3. Read `database/connection.py` - Understand database setup
4. Read `database/models.py` - Understand data structure

**Afternoon (3 hours):**
5. Read `routes/documents.py` lines 38-122 (upload endpoint)
6. Trace the flow: request → validation → GCS → DB → background task
7. Read `routes/documents.py` lines 125-295 (background task)
8. Understand status changes: pending → processing → completed

**Evening (2 hours):**
9. Read `services/ocr_service.py` - Understand OCR flow
10. Read `services/extraction_service.py` - Understand field extraction
11. Read `services/matching_service.py` - Understand matching logic

**Practice:**
- Draw a diagram of the flow
- List all database writes
- List all status changes

---

### Day 3-4: Trace in Logs (See It Work)

**Morning (3 hours):**
1. Start backend locally: `uvicorn main:app --reload`
2. Upload a test document via Postman/Thunder Client
3. Watch console logs - see each step execute
4. Check database: `SELECT * FROM documents ORDER BY id DESC LIMIT 1;`
5. Watch status change: pending → processing → completed

**Afternoon (3 hours):**
6. Add logging statements to trace flow:
   ```python
   logger.info(f"🔍 Step 1: File validated")
   logger.info(f"🔍 Step 2: Uploaded to GCS: {gcs_uri}")
   logger.info(f"🔍 Step 3: Saved to DB with ID: {document.id}")
   ```
7. Upload another document, trace through logs
8. Check each database table after processing:
   - `SELECT * FROM documents WHERE id = 123;`
   - `SELECT * FROM extracted_fields WHERE doc_id = 123;`
   - `SELECT * FROM matches WHERE doc_id = 123;`
   - `SELECT * FROM mismatches WHERE doc_id = 123;`

**Evening (2 hours):**
9. Test error cases:
   - Upload without token → See 401
   - Upload wrong file type → See 400
   - Upload very large file → See timeout/error
10. Check logs for error handling
11. Verify status becomes 'failed' on error

**Practice:**
- Create a log trace document showing each step
- Document what you see in database at each stage
- Note any confusing parts

---

### Day 5+: Experiment Safely

**Safe Experiments (Won't Break Production):**

1. **Add Logging:**
   ```python
   # In process_document_task, add:
   logger.info(f"📊 OCR returned {len(ocr_result['full_text'])} characters")
   logger.info(f"📊 Found {len(extracted_fields)} fields")
   ```

2. **Query Database:**
   ```python
   # In a test script, query:
   documents = db.query(Document).filter(Document.status == 'pending').all()
   print(f"Found {len(documents)} pending documents")
   ```

3. **Test Services Independently:**
   ```python
   # Create test script:
   from services.ocr_service import OCRService
   ocr = OCRService()
   result = ocr.process_document_from_gcs("gs://bucket/test.pdf")
   print(result)
   ```

4. **Modify Response Format:**
   ```python
   # In upload_document, add field:
   return {
       "id": document.id,
       "status": document.status,
       "gcs_uri": gcs_uri,  # Add this
       "uploaded_at": document.created_at.isoformat()  # Add this
   }
   ```

**⚠️ DON'T Experiment With:**
- Database schema changes (without migration)
- Authentication logic (could lock you out)
- Production environment variables
- GCS bucket permissions
- Document AI processor settings

---

## 🚨 Confusing or Risky Parts

### 1. Background Tasks vs Pub/Sub
**Current:** FastAPI BackgroundTasks (runs in same process)
**Risk:** If Cloud Run restarts, tasks are lost
**Future:** Migrate to Pub/Sub for reliability

### 2. Database Sessions
**Confusing:** New session in background task (line 154)
**Why:** Can't reuse session from HTTP request (different thread)
**Risk:** Forgetting to close session = connection leak

### 3. Error Handling in Background Tasks
**Risk:** Errors can fail silently (check logs!)
**Solution:** Always check document status, read logs

### 4. WebSocket Message Queue
**Confusing:** Uses Python `queue.Queue` (thread-safe)
**Risk:** If no WebSocket connected, messages are lost
**Note:** This is MVP - production would use Redis Pub/Sub

### 5. Environment Variables
**Risk:** Missing variables cause silent failures
**Solution:** Always check `/health/db` endpoint

---

## ✅ Checklist: Do You Understand?

After following this path, you should be able to:

- [ ] Explain what happens when a document is uploaded
- [ ] Trace a request from frontend to database
- [ ] Identify where each status change happens
- [ ] Explain why background tasks are needed
- [ ] Understand what each service does
- [ ] Know where failures can occur
- [ ] Explain authentication flow
- [ ] Understand database relationships
- [ ] Read and interpret logs
- [ ] Debug a stuck document (status = 'pending')

If you can do all of these, you understand your backend! 🎉

---

## 📚 Next Steps After Understanding

1. **Add Monitoring:** Track processing times, error rates
2. **Improve Error Handling:** Better error messages, retry logic
3. **Add Tests:** Unit tests for services, integration tests for endpoints
4. **Optimize Queries:** Add database indexes, optimize slow queries
5. **Migrate to Pub/Sub:** For production reliability

But first, master what you have! 🚀

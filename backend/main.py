"""
Main FastAPI application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import documents_router, clients_router, exports_router, matches_router, stats_router
from routes.websocket import router as websocket_router, process_message_queue
from database.models import Base
from database.connection import engine
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Create database tables (with error handling for deployment)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create database tables: {e}")
    print("Database tables will be created when database is available.")

# Initialize FastAPI app
app = FastAPI(
    title="Medical/Billing Document Date Mismatch Detection System",
    description="MVP system for detecting date mismatches in medical/billing documents",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents_router)
app.include_router(clients_router)
app.include_router(exports_router)
app.include_router(matches_router)
app.include_router(stats_router)
app.include_router(websocket_router)


@app.on_event("startup")
async def startup_event():
    """Startup event to initialize background tasks."""
    asyncio.create_task(process_message_queue())


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Medical/Billing Document Date Mismatch Detection System API",
        "version": "1.0.0",
        "endpoints": {
            "upload_document": "POST /documents/upload",
            "upload_clients": "POST /clients/upload",
            "list_documents": "GET /documents/",
            "document_status": "GET /documents/{id}/status",
            "document_details": "GET /documents/{id}",
            "extracted_fields": "GET /documents/{id}/extracted-fields",
            "get_export": "GET /exports/{doc_id}",
            "get_match": "GET /matches/{doc_id}",
            "get_stats": "GET /stats/"
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/health/db")
def health_check_db():
    """Database health check endpoint."""
    try:
        from database.connection import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "message": "Database connection failed. Please set DB environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
        }


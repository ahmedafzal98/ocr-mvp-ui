"""
Main FastAPI application.
"""
import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Configure logging FIRST, before any other imports
from logging_config import setup_logging

# Get log level from environment or default to INFO
log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(log_level=log_level)

# Now import routes and other modules
from routes import documents_router, clients_router, exports_router, matches_router, stats_router
from routes.auth import router as auth_router
from routes.websocket import router as websocket_router, process_message_queue
from database.models import Base
from database.connection import engine

# Create logger for this module
logger = logging.getLogger(__name__)

logger.info("Loading environment variables...")
load_dotenv()
logger.info("Environment variables loaded")

# Detect environment (local vs production)
ENVIRONMENT = os.getenv("ENVIRONMENT", "local").lower()
IS_PRODUCTION = ENVIRONMENT == "production" or os.getenv("PRODUCTION", "false").lower() == "true"
logger.info(f"Environment: {ENVIRONMENT} (Production: {IS_PRODUCTION})")

# Create database tables (with error handling for deployment)
try:
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.warning(f"Could not create database tables: {e}")
    logger.warning("Database tables will be created when database is available.")

# Initialize FastAPI app
app = FastAPI(
    title="Medical/Billing Document Date Mismatch Detection System",
    description="MVP system for detecting date mismatches in medical/billing documents",
    version="1.0.0"
)

# Configure CORS based on environment
if IS_PRODUCTION:
    # In production, restrict to specific origins
    allowed_origins = os.getenv("CORS_ORIGINS", "").split(",")
    allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]
    if not allowed_origins:
        logger.warning("⚠️  PRODUCTION mode but no CORS_ORIGINS set! Allowing all origins (not recommended)")
        allowed_origins = ["*"]
    logger.info(f"CORS allowed origins: {allowed_origins}")
else:
    # In local development, allow all origins
    allowed_origins = ["*"]
    logger.info("CORS: Allowing all origins (local development mode)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    """Log all incoming requests."""
    import time
    start_time = time.time()
    
    # Log request
    logger.info(f"📥 {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(f"📤 {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.2f}s")
    
    return response

# Include routers
# Auth router (public - no auth required)
app.include_router(auth_router)
# Protected routers (require authentication)
app.include_router(documents_router)
app.include_router(clients_router)
app.include_router(exports_router)
app.include_router(matches_router)
app.include_router(stats_router)
app.include_router(websocket_router)


@app.on_event("startup")
async def startup_event():
    """Startup event to initialize background tasks."""
    logger.info("Starting up application...")
    asyncio.create_task(process_message_queue())
    logger.info("Background tasks initialized")


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


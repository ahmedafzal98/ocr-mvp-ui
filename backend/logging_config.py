"""
Production-ready logging configuration for FastAPI + Uvicorn.
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
import os

def setup_logging(log_level: str = "INFO"):
    """
    Configure logging for the application.
    
    This works properly with Uvicorn by configuring loggers before Uvicorn starts.
    """
    # Convert string level to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler (stdout) - unbuffered
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    console_handler.stream = sys.stdout  # Ensure stdout
    
    # Add console handler
    root_logger.addHandler(console_handler)
    
    # Configure Uvicorn loggers to use our configuration
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(logging.INFO)
    uvicorn_logger.handlers.clear()
    uvicorn_logger.addHandler(console_handler)
    uvicorn_logger.propagate = False
    
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.setLevel(logging.INFO)
    uvicorn_access.handlers.clear()
    uvicorn_access.addHandler(console_handler)
    uvicorn_access.propagate = False
    
    # Configure application loggers
    app_logger = logging.getLogger("routes")
    app_logger.setLevel(numeric_level)
    app_logger.propagate = True  # Propagate to root
    
    # Set unbuffered output for immediate visibility
    sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None
    
    return root_logger


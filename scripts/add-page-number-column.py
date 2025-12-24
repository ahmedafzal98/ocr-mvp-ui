#!/usr/bin/env python3
"""
Script to add page_number column to production Cloud SQL database.
This script connects directly using the Cloud SQL connection string.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Set environment variables for Cloud SQL connection
os.environ["DB_HOST"] = "elliptical-feat-476423-q8:us-central1:document-db"
os.environ["DB_PORT"] = "5432"
os.environ["DB_USER"] = "dbuser"
os.environ["DB_PASSWORD"] = "MGPlyP9fyXm9HWa4"
os.environ["DB_NAME"] = "document_extraction_db"

from sqlalchemy import text
from database.connection import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_page_number_columns():
    """Add page_number columns to extracted_fields and mismatches tables."""
    
    # SQL to add columns safely
    migration_sql = """
    -- Add page_number to extracted_fields
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'extracted_fields' 
            AND column_name = 'page_number'
        ) THEN
            ALTER TABLE extracted_fields ADD COLUMN page_number INTEGER DEFAULT 1;
            RAISE NOTICE 'Added page_number column to extracted_fields';
        ELSE
            RAISE NOTICE 'page_number column already exists in extracted_fields';
        END IF;
    END $$;

    -- Add page_number to mismatches
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'mismatches' 
            AND column_name = 'page_number'
        ) THEN
            ALTER TABLE mismatches ADD COLUMN page_number INTEGER DEFAULT 1;
            RAISE NOTICE 'Added page_number column to mismatches';
        ELSE
            RAISE NOTICE 'page_number column already exists in mismatches';
        END IF;
    END $$;
    """
    
    try:
        logger.info("🔧 Connecting to Cloud SQL database...")
        logger.info(f"   Host: {os.environ['DB_HOST']}")
        logger.info(f"   Database: {os.environ['DB_NAME']}")
        
        with engine.connect() as conn:
            with conn.begin():
                logger.info("📝 Executing migration SQL...")
                conn.execute(text(migration_sql))
                logger.info("✅ Migration completed successfully!")
        
        logger.info("")
        logger.info("🎉 Database migration completed!")
        logger.info("   The page_number column has been added to:")
        logger.info("     - extracted_fields table")
        logger.info("     - mismatches table")
        return 0
        
    except Exception as e:
        logger.error(f"❌ Error running migration: {e}", exc_info=True)
        return 1

if __name__ == "__main__":
    sys.exit(add_page_number_columns())


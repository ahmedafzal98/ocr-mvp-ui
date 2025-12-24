"""
Script to run database migrations.
"""
import os
import sys
from pathlib import Path
from sqlalchemy import text
from database.connection import engine
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration(migration_file: str):
    """Run a SQL migration file."""
    migration_path = Path(__file__).parent / "database" / "migrations" / migration_file
    
    if not migration_path.exists():
        logger.error(f"Migration file not found: {migration_path}")
        return 1
    
    logger.info(f"Reading migration file: {migration_path}")
    with open(migration_path, 'r') as f:
        sql = f.read()
    
    try:
        logger.info("Executing migration...")
        with engine.connect() as conn:
            # Use begin() for transaction support
            with conn.begin():
                conn.execute(text(sql))
        logger.info("Migration completed successfully!")
        return 0
    except Exception as e:
        logger.error(f"Error running migration: {e}", exc_info=True)
        return 1

if __name__ == "__main__":
    if len(sys.argv) > 1:
        migration_file = sys.argv[1]
    else:
        migration_file = "add_page_number_columns.sql"
    
    sys.exit(run_migration(migration_file))


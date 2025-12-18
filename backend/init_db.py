"""
Database initialization script.
"""
from database.connection import engine
from database.models import Base
import sys

def init_database():
    """Initialize database tables."""
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        return 0
    except Exception as e:
        print(f"Error creating database tables: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(init_database())


"""
Database connection and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()


class DatabaseSettings(BaseSettings):
    """Database configuration."""
    db_host: str = os.getenv("DB_HOST", "127.0.0.1")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_name: str = os.getenv("DB_NAME", "document_extraction_db")

    @property
    def database_url(self) -> str:
        """Construct database URL."""
        # Check if this is a Cloud SQL connection name (contains colons)
        if ':' in self.db_host:
            # Cloud SQL connection via Unix socket
            # Format: project:region:instance
            # Use Cloud SQL Proxy socket path
            socket_path = f"/cloudsql/{self.db_host}"
            if self.db_password:
                return f"postgresql://{self.db_user}:{self.db_password}@/{self.db_name}?host={socket_path}"
            else:
                return f"postgresql://{self.db_user}@/{self.db_name}?host={socket_path}"
        else:
            # Regular TCP connection
            if self.db_password:
                return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
            else:
                return f"postgresql://{self.db_user}@{self.db_host}:{self.db_port}/{self.db_name}"


# Create database settings
db_settings = DatabaseSettings()

# Create engine
engine = create_engine(
    db_settings.database_url,
    pool_pre_ping=True,
    echo=False  # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


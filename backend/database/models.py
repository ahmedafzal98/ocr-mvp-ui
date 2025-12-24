"""
Database models for the document extraction system.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class ClientProfile(Base):
    """Client profile model."""
    __tablename__ = "client_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    dob = Column(Date, nullable=True)
    doa = Column(Date, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Document(Base):
    """Document model."""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    gcs_uri = Column(String(512), nullable=True)
    status = Column(String(50), default="pending", index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="document", cascade="all, delete-orphan")
    mismatches = relationship("Mismatch", back_populates="document", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="document", cascade="all, delete-orphan")


class ExtractedField(Base):
    """Extracted field from OCR."""
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String(100), nullable=False)
    raw_value = Column(Text, nullable=True)
    normalized_value = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    page_number = Column(Integer, nullable=True)  # Page number where field was found (no default - must be explicitly set)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    document = relationship("Document", back_populates="extracted_fields")

    __table_args__ = (
        UniqueConstraint('doc_id', 'field_name', name='uq_extracted_fields_doc_field'),
    )


class Match(Base):
    """Match between document and client profile."""
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("client_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    match_score = Column(Float, nullable=False)
    decision = Column(String(50), nullable=False)  # 'match', 'ambiguous', 'no_match'
    created_at = Column(DateTime, default=func.now())

    # Relationships
    document = relationship("Document", back_populates="matches")
    client = relationship("ClientProfile")

    __table_args__ = (
        UniqueConstraint('doc_id', 'client_id', name='uq_matches_doc_client'),
    )


class Mismatch(Base):
    """Mismatch between extracted and expected values."""
    __tablename__ = "mismatches"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    field = Column(String(50), nullable=False)  # 'dob', 'doa'
    expected_value = Column(Text, nullable=True)
    observed_value = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)  # Page number where mismatch was found (no default - must be explicitly set)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    document = relationship("Document", back_populates="mismatches")


class Export(Base):
    """Export record."""
    __tablename__ = "exports"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    gcs_uri = Column(String(512), nullable=False)
    signed_url = Column(String(1024), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    document = relationship("Document", back_populates="exports")


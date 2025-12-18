-- Database schema for Medical/Billing Document Date Mismatch Detection System

-- Client profiles table
CREATE TABLE IF NOT EXISTS client_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dob DATE,
    doa DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    gcs_uri VARCHAR(512),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extracted fields table
CREATE TABLE IF NOT EXISTS extracted_fields (
    id SERIAL PRIMARY KEY,
    doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    raw_value TEXT,
    normalized_value TEXT,
    confidence_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doc_id, field_name)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
    match_score FLOAT NOT NULL,
    decision VARCHAR(50) NOT NULL, -- 'match', 'ambiguous', 'no_match'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doc_id, client_id)
);

-- Mismatches table
CREATE TABLE IF NOT EXISTS mismatches (
    id SERIAL PRIMARY KEY,
    doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    field VARCHAR(50) NOT NULL, -- 'dob', 'doa'
    expected_value TEXT,
    observed_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exports table
CREATE TABLE IF NOT EXISTS exports (
    id SERIAL PRIMARY KEY,
    doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    gcs_uri VARCHAR(512) NOT NULL,
    signed_url VARCHAR(1024),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_doc_id ON extracted_fields(doc_id);
CREATE INDEX IF NOT EXISTS idx_matches_doc_id ON matches(doc_id);
CREATE INDEX IF NOT EXISTS idx_matches_client_id ON matches(client_id);
CREATE INDEX IF NOT EXISTS idx_mismatches_doc_id ON mismatches(doc_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_name ON client_profiles(name);


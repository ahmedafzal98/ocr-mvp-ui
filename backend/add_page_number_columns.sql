-- Add page_number columns to existing tables
-- Run this AFTER tables are created

-- First, check if columns already exist (optional - will error if they don't exist)
-- You can skip this check if you're sure they don't exist

-- Add page_number to extracted_fields (if column doesn't exist)
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

-- Add page_number to mismatches (if column doesn't exist)
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

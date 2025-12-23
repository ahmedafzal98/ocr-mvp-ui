-- Check existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- If mismatches table doesn't exist, create all tables using this script
-- Or run the schema.sql file

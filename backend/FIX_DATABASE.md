# Fix Database Connection Error

## Problem
```
FATAL: role "postgres" does not exist
```

## Solution

Your PostgreSQL installation doesn't have a "postgres" user. Your current user is "mbp".

### Option 1: Use Your Current User (Easiest)

Update your `.env` file in the `backend` directory:

```env
DB_USER=mbp
DB_PASSWORD=
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=document_extraction_db
```

### Option 2: Create the postgres Role

If you want to use "postgres" as the user:

```bash
# Connect as your current user
psql -U mbp -d postgres

# Create the postgres role
CREATE ROLE postgres WITH LOGIN PASSWORD 'Ahmed123!';
ALTER ROLE postgres CREATEDB;

# Exit
\q
```

Then your `.env` can use:
```env
DB_USER=postgres
DB_PASSWORD=Ahmed123!
```

### Option 3: Create Database with Current User

```bash
# Create the database
createdb document_extraction_db

# Or if that doesn't work:
psql -U mbp -d postgres -c "CREATE DATABASE document_extraction_db;"
```

## Quick Fix

1. **Check your `.env` file:**
   ```bash
   cd backend
   cat .env | grep DB_
   ```

2. **Update DB_USER to "mbp":**
   ```env
   DB_USER=mbp
   DB_PASSWORD=
   ```

3. **Create the database if it doesn't exist:**
   ```bash
   createdb document_extraction_db
   ```

4. **Restart the backend server**


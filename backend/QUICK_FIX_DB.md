# Quick Fix: Database Connection

## ✅ Database Created!

The database `document_extraction_db` has been created.

## ⚠️ Update Your .env File

Your `.env` file in the `backend` directory needs to use your current PostgreSQL user.

**Current issue:** Your `.env` is trying to use `DB_USER=postgres` but that user doesn't exist.

**Fix:** Update your `.env` file:

```env
DB_USER=mbp
DB_PASSWORD=
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=document_extraction_db
```

## Steps:

1. **Edit `.env` file:**
   ```bash
   cd backend
   nano .env
   # or
   code .env
   ```

2. **Change this line:**
   ```env
   DB_USER=postgres
   ```
   
   **To:**
   ```env
   DB_USER=mbp
   DB_PASSWORD=
   ```

3. **Save and restart the backend server**

## Verify Database Connection

Test the connection:
```bash
psql -U mbp -d document_extraction_db -c "SELECT 1;"
```

Should return: `?column?` with value `1`

## Restart Backend

After updating `.env`, restart your backend:
```bash
cd backend
./start.sh
```

The database connection error should now be fixed! 🎉


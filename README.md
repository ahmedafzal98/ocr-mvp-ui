# OCR MVP UI

A full-stack application for document OCR, extraction, and mismatch detection.

## Project Structure

```
ocr-mvp-ui/
├── backend/              # FastAPI backend
│   ├── database/        # Database models and migrations
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   ├── main.py          # FastAPI application entry point
│   └── requirements.txt # Python dependencies
├── src/                 # React frontend
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── contexts/        # React contexts
│   └── hooks/           # Custom React hooks
├── scripts/             # Deployment and utility scripts
├── public/              # Static assets
└── dist/                # Build output (gitignored)
```

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables (create `.env` file):
   ```env
   DB_HOST=your_db_host
   DB_PORT=5432
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   JWT_SECRET_KEY=your_secret_key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_admin_password
   ```

5. Initialize the database:
   ```bash
   python init_db.py
   ```

6. Start the server:
   ```bash
   ./scripts/start-backend.sh
   # or
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_WS_BASE_URL=ws://localhost:8000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

See scripts in the `scripts/` directory for deployment automation:
- `deploy-backend.sh` - Deploy backend to Cloud Run
- `deploy-frontend.sh` - Deploy frontend to Cloud Run
- `set-auth-env.sh` - Configure authentication
- `set-database-env.sh` - Configure database connection

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: PostgreSQL
- **OCR**: Google Cloud Document AI


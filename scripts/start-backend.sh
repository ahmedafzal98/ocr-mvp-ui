#!/bin/bash

# Start Backend Server Script

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "Starting backend server..."
echo "Backend directory: ${BACKEND_DIR}"

# Change to backend directory
cd "${BACKEND_DIR}" || {
    echo "❌ Error: Cannot change to backend directory: ${BACKEND_DIR}"
    exit 1
}

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Check if .env exists (optional - backend can work without it if env vars are set)
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Backend will use environment variables if set"
    echo "   See .env.example for reference if needed"
    echo ""
fi

# Start the server
echo "✅ Starting FastAPI server on http://127.0.0.1:8000"
echo "   API docs available at http://127.0.0.1:8000/docs"
echo ""
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level info


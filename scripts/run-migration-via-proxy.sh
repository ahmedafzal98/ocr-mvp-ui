#!/bin/bash

# Run database migration using Cloud SQL Proxy
# This works around IPv6 connection issues

set -e

PROJECT_ID="elliptical-feat-476423-q8"
INSTANCE_NAME="document-db"
REGION="us-central1"
DB_NAME="document_extraction_db"
DB_USER="dbuser"
DB_PASSWORD="MGPlyP9fyXm9HWa4"
LOCAL_PORT=5433

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
MIGRATION_FILE="backend/database/migrations/add_page_number_columns.sql"

echo "🔧 Running Database Migration via Cloud SQL Proxy"
echo "=================================================="
echo ""
echo "Connection: ${CONNECTION_NAME}"
echo "Local port: ${LOCAL_PORT}"
echo ""

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "❌ cloud-sql-proxy not found. Installing..."
    echo ""
    echo "Quick install (macOS ARM64):"
    echo "  curl -o /usr/local/bin/cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64"
    echo "  chmod +x /usr/local/bin/cloud-sql-proxy"
    echo ""
    echo "Or use Homebrew:"
    echo "  brew install cloud-sql-proxy"
    echo ""
    read -p "Press Enter after installing cloud-sql-proxy, or Ctrl+C to cancel..."
fi

# Start Cloud SQL Proxy in background
echo "🚀 Starting Cloud SQL Proxy..."
cloud-sql-proxy ${CONNECTION_NAME} --port ${LOCAL_PORT} > /tmp/cloud-sql-proxy.log 2>&1 &
PROXY_PID=$!

echo "   Proxy PID: ${PROXY_PID}"
echo "   Waiting for proxy to start..."
sleep 5

# Check if proxy started successfully
if ! kill -0 ${PROXY_PID} 2>/dev/null; then
    echo "❌ Error: Cloud SQL Proxy failed to start"
    echo "   Check logs: cat /tmp/cloud-sql-proxy.log"
    exit 1
fi

echo "✅ Proxy started on port ${LOCAL_PORT}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping Cloud SQL Proxy (PID: ${PROXY_PID})..."
    kill ${PROXY_PID} 2>/dev/null || true
    wait ${PROXY_PID} 2>/dev/null || true
    echo "✅ Proxy stopped"
}

trap cleanup EXIT INT TERM

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client:"
    echo "   macOS: brew install postgresql"
    echo "   Or use the Python script method instead"
    exit 1
fi

echo "📝 Running migration SQL..."
export PGPASSWORD="${DB_PASSWORD}"

# Read migration SQL and run it
cat "${MIGRATION_FILE}" | psql \
  -h 127.0.0.1 \
  -p ${LOCAL_PORT} \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  -v ON_ERROR_STOP=1

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "🧪 Test the endpoint:"
echo "   curl https://document-mismatch-detection-api-267816589183.us-central1.run.app/documents/64/extracted-fields"


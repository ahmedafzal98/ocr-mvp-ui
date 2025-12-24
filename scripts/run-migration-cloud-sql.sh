#!/bin/bash

# Alternative method: Run migration using psql via Cloud SQL Proxy
# This requires cloud-sql-proxy to be running

set -e

PROJECT_ID="elliptical-feat-476423-q8"
INSTANCE_NAME="document-db"
REGION="us-central1"
DB_NAME="document_extraction_db"
DB_USER="dbuser"
DB_PASSWORD="MGPlyP9fyXm9HWa4"
PORT=5433

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
MIGRATION_FILE="backend/database/migrations/add_page_number_columns.sql"

echo "🔧 Running Production Database Migration via Cloud SQL Proxy"
echo "============================================================"
echo ""

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "❌ Error: cloud-sql-proxy is not installed."
    echo ""
    echo "Install it:"
    echo "  # Linux/Mac"
    echo "  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64"
    echo "  chmod +x cloud-sql-proxy"
    echo ""
    echo "  # Or use Homebrew"
    echo "  brew install cloud-sql-proxy"
    exit 1
fi

echo "📋 Starting Cloud SQL Proxy in background..."
cloud-sql-proxy ${CONNECTION_NAME} --port ${PORT} > /tmp/cloud-sql-proxy.log 2>&1 &
PROXY_PID=$!

echo "   Proxy PID: ${PROXY_PID}"
echo "   Waiting for proxy to start..."
sleep 3

# Check if proxy is running
if ! kill -0 ${PROXY_PID} 2>/dev/null; then
    echo "❌ Error: Cloud SQL Proxy failed to start"
    echo "   Check logs: cat /tmp/cloud-sql-proxy.log"
    exit 1
fi

echo "✅ Proxy started successfully"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping Cloud SQL Proxy..."
    kill ${PROXY_PID} 2>/dev/null || true
    wait ${PROXY_PID} 2>/dev/null || true
}

trap cleanup EXIT

echo "📝 Running migration..."
export PGPASSWORD="${DB_PASSWORD}"

psql -h 127.0.0.1 \
  -p ${PORT} \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  -f ${MIGRATION_FILE}

echo ""
echo "✅ Migration completed successfully!"


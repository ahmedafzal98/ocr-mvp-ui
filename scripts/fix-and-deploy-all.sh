#!/bin/bash

# Complete fix and deployment script
# Fixes database migration and redeploys both backend and frontend

set -e

PROJECT_ID="elliptical-feat-476423-q8"
INSTANCE_NAME="document-db"
DB_NAME="document_extraction_db"
DB_USER="dbuser"

echo "🚀 Complete Fix and Deployment"
echo "=============================="
echo ""

# Step 1: Database Migration
echo "Step 1: Adding page_number column to database"
echo "----------------------------------------------"
echo ""

read -p "Have you run the database migration? (y/n): " migration_done

if [ "$migration_done" != "y" ]; then
    echo ""
    echo "📝 Please run the migration first:"
    echo ""
    echo "   gcloud beta sql connect ${INSTANCE_NAME} \\"
    echo "     --user=${DB_USER} \\"
    echo "     --database=${DB_NAME} \\"
    echo "     --project=${PROJECT_ID}"
    echo ""
    echo "   Then paste:"
    echo "     ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;"
    echo "     ALTER TABLE mismatches ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;"
    echo "     \\q"
    echo ""
    read -p "Press Enter after running the migration, or Ctrl+C to cancel..."
fi

# Step 2: Redeploy Backend
echo ""
echo "Step 2: Redeploying Backend"
echo "---------------------------"
echo ""

read -p "Redeploy backend now? (y/n): " deploy_backend
if [ "$deploy_backend" = "y" ]; then
    echo ""
    cd "$(dirname "$0")/.."
    ./scripts/redeploy-backend.sh
else
    echo "Skipping backend deployment"
fi

# Step 3: Frontend
echo ""
echo "Step 3: Frontend Deployment"
echo "---------------------------"
echo ""
echo "Frontend needs to be redeployed via:"
echo "  1. Vercel Dashboard (Deployments → Redeploy)"
echo "  2. Or git push (if connected to Git)"
echo ""
echo "All code changes are already committed and ready."

echo ""
echo "✅ Deployment process complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Verify database migration completed"
echo "  2. Test backend endpoint (should return 200, not 500)"
echo "  3. Redeploy frontend via Vercel"
echo "  4. Test document upload (should complete, not get stuck)"


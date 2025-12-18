#!/bin/bash

# Script to update frontend environment variables after backend deployment
# Usage: ./update-frontend-env.sh <backend-url>

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Backend URL is required"
    echo ""
    echo "Usage: ./update-frontend-env.sh <backend-url>"
    echo ""
    echo "Example:"
    echo "  ./update-frontend-env.sh https://document-mismatch-detection-api-xxxxx.run.app"
    exit 1
fi

BACKEND_URL=$1

# Convert HTTP to WebSocket URL
WS_URL=$(echo $BACKEND_URL | sed 's|https://|wss://|' | sed 's|http://|ws://|')

echo "📝 Updating frontend environment variables..."
echo ""
echo "Backend URL: $BACKEND_URL"
echo "WebSocket URL: $WS_URL"
echo ""

# Create .env file
cat > .env << EOF
# Frontend Environment Variables
# Generated automatically - update these in Vercel dashboard for production

# Backend API URL
VITE_API_BASE_URL=$BACKEND_URL

# WebSocket URL
VITE_WS_BASE_URL=$WS_URL
EOF

echo "✅ Created .env file with:"
echo "   VITE_API_BASE_URL=$BACKEND_URL"
echo "   VITE_WS_BASE_URL=$WS_URL"
echo ""
echo "📋 Next steps:"
echo "   1. Update these in Vercel Dashboard:"
echo "      - Go to Project Settings → Environment Variables"
echo "      - Add/Update VITE_API_BASE_URL = $BACKEND_URL"
echo "      - Add/Update VITE_WS_BASE_URL = $WS_URL"
echo "   2. Redeploy your frontend on Vercel"
echo ""


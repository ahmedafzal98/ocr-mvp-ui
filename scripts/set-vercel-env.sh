#!/bin/bash

# Script to set Vercel environment variables for production
# Make sure you have Vercel CLI installed: npm i -g vercel

set -e

BACKEND_URL="https://document-mismatch-detection-api-267816589183.us-central1.run.app"
WS_BACKEND_URL="wss://document-mismatch-detection-api-267816589183.us-central1.run.app"

echo "🔧 Setting Vercel Environment Variables"
echo "========================================"
echo ""
echo "Backend URL: ${BACKEND_URL}"
echo "WebSocket URL: ${WS_BACKEND_URL}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI is not installed."
    echo "   Install it with: npm i -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

echo "📝 Adding environment variables..."
echo ""

# Add API_BASE_URL for production
echo "Setting VITE_API_BASE_URL for production..."
echo "${BACKEND_URL}" | vercel env add VITE_API_BASE_URL production

# Add API_BASE_URL for preview (optional, but recommended)
read -p "Also set for preview environments? (y/n): " preview_confirm
if [ "$preview_confirm" = "y" ]; then
    echo "${BACKEND_URL}" | vercel env add VITE_API_BASE_URL preview
fi

# Add WS_BASE_URL for production
echo "Setting VITE_WS_BASE_URL for production..."
echo "${WS_BACKEND_URL}" | vercel env add VITE_WS_BASE_URL production

if [ "$preview_confirm" = "y" ]; then
    echo "${WS_BACKEND_URL}" | vercel env add VITE_WS_BASE_URL preview
fi

echo ""
echo "✅ Environment variables set successfully!"
echo ""
echo "🚀 Next steps:"
echo "   1. Redeploy your site: vercel --prod"
echo "   OR"
echo "   2. Go to Vercel dashboard and click 'Redeploy' on your latest deployment"
echo ""
echo "📋 To verify, check your site's network tab - API calls should go to:"
echo "   ${BACKEND_URL}"


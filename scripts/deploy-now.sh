#!/bin/bash

# Quick deployment script - helps set up and deploy backend
# This uses Cloud Build (no Docker required locally)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🚀 Backend Deployment Setup"
echo "============================"
echo ""

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    read -p "Enter your Google Cloud Project ID (default: 267816589183): " PROJECT_ID
    PROJECT_ID=${PROJECT_ID:-"267816589183"}
fi

# Generate JWT secret if not set
if [ -z "$JWT_SECRET_KEY" ]; then
    echo "🔐 Generating secure JWT secret key..."
    JWT_SECRET_KEY=$(openssl rand -hex 32)
    echo "   Generated JWT_SECRET_KEY (saved for this deployment)"
fi

# Ask for CORS origins
if [ -z "$CORS_ORIGINS" ]; then
    echo ""
    echo "🌐 CORS Configuration"
    read -p "Enter your frontend URL for CORS (e.g., https://yourdomain.com) or press Enter to allow all: " CORS_ORIGINS
    if [ -z "$CORS_ORIGINS" ]; then
        echo "⚠️  Warning: Allowing all origins (not recommended for production)"
    fi
fi

# Ask for database credentials
echo ""
echo "🗄️  Database Configuration"
read -p "Enter DB_HOST (database host or Cloud SQL connection): " DB_HOST
read -p "Enter DB_PORT (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "Enter DB_USER: " DB_USER
read -s -p "Enter DB_PASSWORD: " DB_PASSWORD
echo ""
read -p "Enter DB_NAME (default: document_extraction_db): " DB_NAME
DB_NAME=${DB_NAME:-document_extraction_db}

# Export variables for deployment script
export PROJECT_ID
export JWT_SECRET_KEY
export CORS_ORIGINS
export DB_HOST
export DB_PORT
export DB_USER
export DB_PASSWORD
export DB_NAME

echo ""
echo "📋 Deployment Summary:"
echo "   Project ID: ${PROJECT_ID}"
echo "   CORS Origins: ${CORS_ORIGINS:-* (all)}"
echo "   DB Host: ${DB_HOST}"
echo "   DB Name: ${DB_NAME}"
echo ""

read -p "Continue with deployment? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo "🚀 Starting deployment using Cloud Build..."
echo "   (This may take 5-10 minutes)"
echo ""

# Run Cloud Build deployment
cd "$SCRIPT_DIR"
./deploy-backend-cloudbuild.sh


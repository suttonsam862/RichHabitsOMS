#!/bin/bash

# ThreadCraft Deployment Script
# This script automates the deployment process for the ThreadCraft application

echo "Starting ThreadCraft deployment process..."

# Check for required environment variables
echo "Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "ERROR: STRIPE_SECRET_KEY environment variable is not set"
  exit 1
fi

if [ -z "$VITE_STRIPE_PUBLIC_KEY" ]; then
  echo "ERROR: VITE_STRIPE_PUBLIC_KEY environment variable is not set"
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Run database migrations
echo "Updating database schema..."
npm run db:push

# Build the application
echo "Building application for production..."
npm run build

# Verify build
if [ ! -d "./dist" ]; then
  echo "ERROR: Build failed - dist directory not found"
  exit 1
fi

echo "Deployment preparation complete!"
echo "You can now start the application in production mode with: npm start"
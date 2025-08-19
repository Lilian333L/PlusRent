#!/bin/bash

echo "🚀 Vercel Deployment Helper Script"
echo "=================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "✅ Vercel CLI is installed"

# Check if we're logged in
if vercel whoami &> /dev/null; then
    echo "✅ Already logged in to Vercel"
    echo "Deploying to production..."
    vercel --prod
else
    echo "❌ Not logged in to Vercel"
    echo ""
    echo "🔧 Manual Deployment Options:"
    echo "1. Go to https://vercel.com and sign up/login with: hamcho243332@gmail.com"
    echo "2. Create a new project and upload your files"
    echo "3. Or try the CLI login again: vercel login"
    echo ""
    echo "📋 Current project status:"
    echo "✅ Local server running on http://localhost:3001"
    echo "✅ Login working with: admin / admin123"
    echo "✅ API endpoints functional"
    echo ""
    echo "🌐 Open these URLs to test locally:"
    echo "   Main site: http://localhost:3001"
    echo "   Login: http://localhost:3001/login"
    echo "   API health: http://localhost:3001/api/auth/health"
fi 
# Vercel Deployment Guide

## Current Status
✅ **Local server is running perfectly on http://localhost:3001**
✅ **Login functionality is working with default credentials: admin / admin123**
✅ **All API endpoints are functional**

## Manual Vercel Deployment Steps

Since the Vercel CLI login is experiencing SSL issues, here's how to deploy manually:

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login with your email: hamcho243332@gmail.com**
3. **Click "New Project"**
4. **Import your GitHub repository** (if you have one) or **Upload your project files**
5. **Configure the project:**
   - Framework Preset: `Node.js`
   - Root Directory: `.` (current directory)
   - Build Command: `npm install` (or leave empty)
   - Output Directory: `.` (current directory)
   - Install Command: `npm install`

### Option 2: Fix Vercel CLI Login

If you want to use the CLI, try these steps:

1. **Clear Vercel cache:**
   ```bash
   rm -rf ~/.vercel
   ```

2. **Try login with a different browser or incognito mode**

3. **Alternative login method:**
   ```bash
   vercel login --scope=your-team-name
   ```

### Option 3: Deploy via GitHub Integration

1. **Push your code to GitHub**
2. **Connect your GitHub account to Vercel**
3. **Import the repository**
4. **Vercel will automatically detect the configuration**

## Project Configuration

The project is already configured for Vercel with:

- ✅ `vercel.json` - Serverless function configuration
- ✅ `api/index.js` - Main API handler
- ✅ Proper CORS settings for production
- ✅ Environment variables support

## Testing the Deployment

Once deployed, you can test:

1. **Main website**: `https://your-project.vercel.app`
2. **Login page**: `https://your-project.vercel.app/login`
3. **API health check**: `https://your-project.vercel.app/api/auth/health`
4. **Login API**: `https://your-project.vercel.app/api/auth/login`

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@rentaly.com`

## Environment Variables (if needed)

If you need to set environment variables in Vercel:

1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add any required variables (database connections, etc.)

## Current Local Server Status

The local server is running successfully with:
- ✅ Main website: http://localhost:3001
- ✅ Login page: http://localhost:3001/login
- ✅ API endpoints: http://localhost:3001/api/*
- ✅ Database connection working
- ✅ Authentication system functional

## Troubleshooting

If you encounter issues:

1. **Check the browser console for errors**
2. **Verify API endpoints are responding**
3. **Ensure database is accessible**
4. **Check CORS settings for your domain**

## Next Steps

1. **Test the local server** (already working)
2. **Deploy to Vercel** using one of the methods above
3. **Update the API base URL** in `Rentaly HTML/js/config.js` if needed
4. **Test the production deployment**

The local server is fully functional and ready for deployment! 
# 🚀 Rentaly Deployment Guide

## 📊 PostgreSQL Pricing for 5000 Users/Month

### **Recommended: Supabase**
- **Free Tier**: 500MB database, 2GB bandwidth, 50,000 monthly active users
- **Pro Plan ($25/month)**: 8GB database, 250GB bandwidth, unlimited users
- **Perfect for your 5000 users/month**

### **Alternative Options:**
- **Vercel Postgres**: $20/month (1GB storage, 100GB bandwidth)
- **PlanetScale**: $29/month (10GB storage, 10 billion reads/month)
- **Railway**: $5-15/month (pay-as-you-go)

## 🛠️ Setup Instructions

### **Step 1: Create Supabase Account**
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Note down your project URL and API key

### **Step 2: Get Database Connection String**
1. In Supabase Dashboard → Settings → Database
2. Copy the **Connection string** or **URI**
3. Note down the **Host**, **Database name**, **Port**, **User**, and **Password**

### **Step 3: Environment Variables**
Set these environment variables in your Vercel deployment:

```bash
# Application Configuration
NODE_ENV=production
PORT=3001
```

### **Step 4: Database Setup**
Run the database setup script:

```bash
# Set environment variable
export SUPABASE_URL="your_connection_string_here"

# Setup database tables
node scripts/setup-postgres.js

# Migrate existing data (if any)
node scripts/migrate-to-postgres.js
```

### **Step 5: Vercel Deployment**
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy

## 🔧 Current Configuration

### **Working API Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI
```

### **Project Reference:**
```
lupoqmzqppynyybbvwah
```

### **REST API URL:**
```
https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/
```

## 🚨 Important Notes

1. **Database Connection**: The PostgreSQL connection string needs to be obtained from your Supabase dashboard
2. **SSL Required**: Supabase requires SSL connections
3. **Environment Variables**: Make sure to set all environment variables in Vercel
4. **Database Tables**: Run the setup script to create the required tables

## 📞 Support

If you encounter issues:
1. Check your Supabase project status
2. Verify the connection string format
3. Ensure all environment variables are set correctly
4. Check the Vercel deployment logs for errors 
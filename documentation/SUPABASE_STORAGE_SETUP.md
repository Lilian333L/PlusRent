# Supabase Storage Setup Guide

## Overview
This guide will help you set up Supabase Storage to handle car image uploads instead of local file storage. This will fix the 404 errors you're seeing in Vercel preview.

## Step 1: Create Storage Bucket

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Create the Storage Bucket**
   - Go to **Storage** in the left sidebar
   - Click **Create a new bucket**
   - Set the following:
     - **Name**: `car-images`
     - **Public bucket**: ✅ Check this box
     - **File size limit**: `50 MB`
     - **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`

3. **Click Create bucket**

## Step 2: Configure Storage Policies

1. **Go to Storage > Policies**
2. **Select the `car-images` bucket**
3. **Add the following policies:**

### Policy 1: Public Read Access
- **Policy name**: `
- Public read access`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition**: `true`

### Policy 2: Authenticated Insert
- **Policy name**: `Authenticated insert`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**: `true`

### Policy 3: Authenticated Update
- **Policy name**: `Authenticated update`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition**: `true`

### Policy 4: Authenticated Delete
- **Policy name**: `Authenticated delete`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**: `true`

## Step 3: Deploy Updated Code

The code has been updated to use Supabase Storage. Deploy it to Vercel:

```bash
git add .
git commit -m "Update image upload to use Supabase Storage"
git push origin fix-sqlite-errors
```

## Step 4: Test the Setup

1. **Go to your Vercel preview URL**
2. **Navigate to the admin panel**
3. **Try uploading images for a car**
4. **Check that images are now accessible**

## What Changed

### Before (Local Storage)
- Images were saved to `/uploads/car-6/head.jpg`
- Vercel couldn't serve these files (404 errors)
- Files were stored locally

### After (Supabase Storage)
- Images are uploaded to Supabase Storage bucket
- URLs are like: `https://lupoqmzqppynyybbvwah.supabase.co/storage/v1/object/public/car-images/car-6/head.jpg`
- Images are accessible from anywhere
- No more 404 errors

## Troubleshooting

### If images still show 404:
1. Check that the bucket is public
2. Verify the storage policies are set correctly
3. Check the browser console for the actual image URLs
4. Ensure the car ID exists in the database

### If uploads fail:
1. Check the server logs for Supabase errors
2. Verify your Supabase credentials are correct
3. Ensure the bucket name matches exactly: `car-images`

## Migration from Local Storage

If you have existing cars with local image paths, you'll need to migrate them:

1. Download the existing images from your local `uploads` directory
2. Re-upload them through the admin panel
3. Or create a migration script to upload them to Supabase Storage

## Benefits

- ✅ No more 404 errors in Vercel
- ✅ Images are served from Supabase CDN (faster)
- ✅ Automatic backup and redundancy
- ✅ No local storage management needed
- ✅ Works across all environments (dev, staging, production) 
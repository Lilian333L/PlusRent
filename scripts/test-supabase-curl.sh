#!/bin/bash

# Supabase configuration
PROJECT_REF="lupoqmzqppynyybbvwah"
SUPABASE_URL="https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/"

echo "🔍 Testing Supabase REST API with curl..."
echo "Project Reference: $PROJECT_REF"
echo "API URL: $SUPABASE_URL"
echo ""

# Test 1: Basic connection test (without auth)
echo "📡 Test 1: Basic connection test (without authentication)"
curl -s -o /dev/null -w "Status: %{http_code}\n" "$SUPABASE_URL"
echo ""

# Test 2: With authentication (you need to replace YOUR_ANON_KEY)
echo "📡 Test 2: With authentication (replace YOUR_ANON_KEY with your actual key)"
echo "Run this command with your actual anon key:"
echo "curl \"$SUPABASE_URL\" \\"
echo "  -H \"apikey: YOUR_ANON_KEY\" \\"
echo "  -H \"Authorization: Bearer YOUR_ANON_KEY\""
echo ""

# Test 3: Test specific table (if you have tables)
echo "📡 Test 3: Test specific table (replace 'cars' with your table name)"
echo "curl \"$SUPABASE_URL/cars\" \\"
echo "  -H \"apikey: YOUR_ANON_KEY\" \\"
echo "  -H \"Authorization: Bearer YOUR_ANON_KEY\""
echo ""

echo "📋 To get your anon key:"
echo "   1. Go to your Supabase Dashboard"
echo "   2. Settings → API → Project API keys"
echo "   3. Copy the 'anon public' key"
echo ""

echo "🔧 Example with actual key (replace YOUR_ANON_KEY):"
echo "curl \"$SUPABASE_URL\" \\"
echo "  -H \"apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\" \\"
echo "  -H \"Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"" 
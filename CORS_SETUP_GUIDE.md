# 🔒 CORS Configuration Guide

## Overview

This guide explains how to properly configure CORS (Cross-Origin Resource Sharing) for your Rentaly application across different environments.

## 🚀 Quick Setup

### 1. Environment Variables

Add these environment variables to your deployment platform:

```bash
# For Vercel
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CUSTOM_DOMAIN=yourdomain.com

# For local development
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### 2. Vercel Configuration

Update your `vercel.json`:

```json
{
  "version": 2,
  "public": true,
  "regions": ["fra1"],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

## 🌍 Environment-Specific Configuration

### Development Environment

**Behavior**: Permissive CORS (allows all origins)
**Use Case**: Local development, testing

```javascript
// Automatically allows all origins in development
const devCorsMiddleware = cors({
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  origin: true // Allow all origins
});
```

**Allowed Origins**:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5000`
- `http://localhost:8080`
- `http://127.0.0.1:*`
- Any origin (for development flexibility)

### Production Environment

**Behavior**: Strict CORS (only allows specified origins)
**Use Case**: Live production deployment

```javascript
// Only allows specified origins in production
const strictCorsMiddleware = cors({
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
});
```

## 🏢 Deployment Platforms

### Vercel Deployment

**Automatic Features**:
- ✅ Vercel preview URLs automatically allowed
- ✅ Production URLs automatically detected
- ✅ Environment variables automatically available

**Setup**:
1. Deploy to Vercel
2. Add environment variables in Vercel dashboard
3. CORS automatically configured

**Environment Variables**:
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CUSTOM_DOMAIN=yourdomain.com
```

### Custom Domain Setup

If you have a custom domain:

1. **Add to Vercel**: Configure custom domain in Vercel dashboard
2. **Set Environment Variable**:
   ```bash
   CUSTOM_DOMAIN=yourdomain.com
   ```
3. **Update ALLOWED_ORIGINS**:
   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

### Other Platforms (Netlify, Railway, etc.)

**Environment Variables**:
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CUSTOM_DOMAIN=yourdomain.com
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` or `development` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `https://domain.com,https://www.domain.com` |
| `CUSTOM_DOMAIN` | Custom domain for pattern matching | `yourdomain.com` |
| `VERCEL_URL` | Automatically set by Vercel | `your-app.vercel.app` |

### CORS Options

```javascript
const corsOptions = {
  credentials: true,                    // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  maxAge: 86400,                       // Preflight cache: 24 hours
};
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. CORS Error in Development

**Problem**: `Access to fetch at 'http://localhost:3003/api/cars' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution**: 
- Ensure you're running in development mode (`NODE_ENV=development`)
- Check that your frontend is running on an allowed port
- Verify the API server is running on the correct port

#### 2. CORS Error in Production

**Problem**: `Access to fetch at 'https://api.yourdomain.com/cars' from origin 'https://yourdomain.com' has been blocked by CORS policy`

**Solution**:
- Add your domain to `ALLOWED_ORIGINS`
- Set `CUSTOM_DOMAIN` environment variable
- Check Vercel environment variables are set correctly

#### 3. Vercel Preview Deployments

**Problem**: CORS errors in Vercel preview deployments

**Solution**:
- Vercel preview URLs are automatically allowed
- Check that `VERCEL_URL` environment variable is available
- Ensure `NODE_ENV` is set correctly

### Debug CORS Issues

Add this to your API to debug CORS:

```javascript
// Add to your API routes for debugging
app.use((req, res, next) => {
  console.log('🌐 Request Origin:', req.headers.origin);
  console.log('🌐 Request Method:', req.method);
  console.log('🌐 Request Headers:', req.headers);
  next();
});
```

## 🔒 Security Considerations

### Development vs Production

| Environment | CORS Policy | Security Level |
|-------------|-------------|----------------|
| Development | Permissive (all origins) | Low (for convenience) |
| Production | Strict (whitelist only) | High (secure) |

### Best Practices

1. **Never use `origin: '*'` in production**
2. **Always specify exact domains in `ALLOWED_ORIGINS`**
3. **Use HTTPS in production**
4. **Set appropriate `maxAge` for preflight requests**
5. **Log blocked origins for debugging**

### Security Headers

Consider adding these security headers:

```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## 📝 Example Configurations

### Local Development

```bash
# .env.local
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### Production with Custom Domain

```bash
# Vercel Environment Variables
NODE_ENV=production
ALLOWED_ORIGINS=https://rentaly.com,https://www.rentaly.com
CUSTOM_DOMAIN=rentaly.com
```

### Multiple Environments

```bash
# Development
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# Staging
NODE_ENV=production
ALLOWED_ORIGINS=https://staging.rentaly.com

# Production
NODE_ENV=production
ALLOWED_ORIGINS=https://rentaly.com,https://www.rentaly.com
CUSTOM_DOMAIN=rentaly.com
```

## ✅ Testing CORS

### Test with curl

```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://your-api.vercel.app/api/cars

# Test actual request
curl -X POST \
  -H "Origin: https://yourdomain.com" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  https://your-api.vercel.app/api/cars
```

### Test with JavaScript

```javascript
// Test CORS from browser console
fetch('https://your-api.vercel.app/api/cars', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('CORS working:', data))
.catch(error => console.error('CORS error:', error));
```

## 🎯 Summary

1. **Development**: Permissive CORS for easy development
2. **Production**: Strict CORS with whitelisted origins
3. **Vercel**: Automatic preview URL support
4. **Custom Domains**: Add to `ALLOWED_ORIGINS` and `CUSTOM_DOMAIN`
5. **Environment Variables**: Configure per deployment environment

This setup provides security in production while maintaining flexibility during development. 
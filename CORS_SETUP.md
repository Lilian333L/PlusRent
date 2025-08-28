# CORS Configuration System

This project uses separate CORS configurations for development and production environments to ensure security and ease of deployment.

## Files

- `middleware/cors.js` - **Current active CORS configuration**
- `middleware/cors.production.js` - **Production CORS configuration (strict security)**
- `scripts/switch-cors.js` - **Script to switch between configurations**

## Current Configuration

### Development (Default)
- **File**: `middleware/cors.js`
- **Security**: Permissive
- **Behavior**: Allows all origins for easy development
- **Use Case**: Local development, testing, Vercel preview deployments

### Production
- **File**: `middleware/cors.production.js`
- **Security**: Strict
- **Behavior**: Only allows specified domains
- **Use Case**: Live production environment

## Usage

### Check Current Status
```bash
npm run cors:status
```

### Switch to Production CORS
```bash
npm run cors:prod
```
This will:
1. Backup your current `cors.js` file
2. Copy `cors.production.js` to `cors.js`
3. Enable strict CORS for production

### Switch Back to Development CORS
```bash
npm run cors:dev
```
This will:
1. Restore your backed up development CORS file
2. Enable permissive CORS for development

## Production Setup

### 1. Update Production Domains
Edit `middleware/cors.production.js` and update the `productionOrigins` array:

```javascript
const productionOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://rentaly.vercel.app',
  // Add your other production domains here
];
```

### 2. Set Environment Variables
In your Vercel dashboard, add:
- `ALLOWED_ORIGINS`: `https://yourdomain.com,https://www.yourdomain.com`

### 3. Deploy to Production
```bash
# Switch to production CORS
npm run cors:prod

# Commit and push
git add .
git commit -m "Switch to production CORS configuration"
git push
```

## Development Workflow

### 1. Start Development
```bash
# Ensure you're using development CORS
npm run cors:dev

# Start development server
npm run dev
```

### 2. Test Changes
- All origins are allowed in development
- No CORS restrictions for testing

### 3. Deploy to Production
```bash
# Switch to production CORS
npm run cors:prod

# Deploy
git add .
git commit -m "Deploy with production CORS"
git push
```

## Security Features

### Development
- ✅ Permissive CORS for easy testing
- ✅ Allows all origins
- ✅ Detailed logging for debugging

### Production
- 🔒 Strict CORS policy
- 🔒 Only allows specified domains
- 🔒 Blocks unauthorized origins
- 🔒 Security logging for monitoring

## Troubleshooting

### CORS Errors in Production
1. Check if you're using production CORS: `npm run cors:status`
2. Verify your domains are in `productionOrigins` array
3. Check `ALLOWED_ORIGINS` environment variable
4. Review Vercel function logs for blocked origins

### CORS Errors in Development
1. Ensure you're using development CORS: `npm run cors:dev`
2. Check if the development server is running
3. Verify the API endpoint is accessible

### Backup Issues
If you lose your development CORS backup:
1. The original development CORS is in `middleware/cors.production.js` (you can copy it back)
2. Or recreate the development configuration manually

## File Structure
```
middleware/
├── cors.js              # Current active CORS (development or production)
├── cors.production.js   # Production CORS configuration
└── cors.backup.js       # Backup of development CORS (created automatically)

scripts/
└── switch-cors.js       # CORS switching utility

CORS_SETUP.md            # This documentation
```

## Important Notes

- **Always test** your CORS configuration before deploying to production
- **Keep backups** of your development configuration
- **Monitor logs** for any CORS-related issues
- **Update domains** in production configuration when adding new domains
- **Use environment variables** for additional domains in production

## Quick Commands Reference

| Command | Action |
|---------|--------|
| `npm run cors:status` | Check current CORS configuration |
| `npm run cors:prod` | Switch to production CORS |
| `npm run cors:dev` | Switch to development CORS |
| `npm run dev` | Start development server |
| `npm run api` | Start API server | 
# Deploying to Heroku

This guide explains how to deploy the Receipts app to Heroku.

## Prerequisites

1. Heroku account (sign up at https://heroku.com)
2. Heroku CLI installed (`brew install heroku/brew/heroku` on macOS)
3. Git repository initialized
4. MongoDB database (use MongoDB Atlas or Heroku MongoDB addon)

## Quick Deploy Steps

### 1. Install Heroku CLI and Login

```bash
# Install Heroku CLI (if not installed)
# macOS: brew install heroku/brew/heroku
# Or download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login
```

### 2. Create Heroku App

```bash
# From project root
cd /Users/valentinbarakov/proecti/receipts

# Create a new Heroku app
heroku create your-app-name

# Or let Heroku generate a name
heroku create
```

### 3. Set Up MongoDB

**Option A: MongoDB Atlas (Recommended - Free tier available)**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string (format: `mongodb+srv://user:pass@cluster.mongodb.net/receipt?retryWrites=true&w=majority`)
4. Set it in Heroku:

```bash
heroku config:set MONGODB_URI="your-mongodb-connection-string"
```

**Option B: Heroku MongoDB Addon**

```bash
heroku addons:create mongolab:sandbox
# Connection string will be automatically set as MONGODB_URI
```

### 4. Set Environment Variables

Set all required environment variables in Heroku:

```bash
# Required
heroku config:set MONGODB_URI="your-mongodb-connection-string"
heroku config:set JWT_SECRET="$(openssl rand -base64 32)"
heroku config:set NODE_ENV="production"

# Optional but recommended
heroku config:set JWT_EXPIRES_IN="24h"
heroku config:set WEBHOOK_IPS="213.91.159.250,87.121.163.64"
heroku config:set CORS_ORIGIN="https://your-app-name.herokuapp.com"

# BRP Configuration (if needed)
heroku config:set BRP_API_URL="https://api.brp.example.com"
heroku config:set BRP_API_KEY="your-api-key"
heroku config:set BRP_WEBHOOK_URL="https://your-app-name.herokuapp.com/webhook"
heroku config:set BRP_WEBHOOK_SECRET="$(openssl rand -base64 32)"

# Frontend build-time variables (for Vite)
heroku config:set VITE_API_URL="https://your-app-name.herokuapp.com/api"
heroku config:set VITE_WS_URL="wss://your-app-name.herokuapp.com"
```

**Note:** Vite environment variables (`VITE_*`) are embedded at build time, so they need to be set before deployment.

### 5. Deploy to Heroku

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Heroku deployment"

# Deploy to Heroku
git push heroku main

# Or if your default branch is master:
git push heroku master
```

### 6. Verify Deployment

```bash
# Check app status
heroku ps

# View logs
heroku logs --tail

# Open app in browser
heroku open
```

## How It Works

### Build Process

1. **Heroku detects Node.js app** (via `package.json`)
2. **Runs `npm install`** in root directory
3. **Runs `heroku-postbuild` script** which:
   - Installs frontend dependencies
   - Builds frontend (Vite)
   - Installs backend dependencies
   - Builds backend (TypeScript)
   - Copies frontend build to `server/public/`
4. **Runs `npm start`** (or Procfile command) which:
   - Starts the server from `server/dist/server.js`
   - Serves the React app from `server/public/`

### Port Configuration

- Heroku automatically sets `PORT` environment variable
- Your server reads `process.env.PORT` (already configured in `server/src/utils/env.ts`)
- No changes needed!

### WebSocket Support

- Heroku supports WebSocket connections
- Socket.IO will automatically use `wss://` (secure WebSocket) on HTTPS
- Frontend uses relative WebSocket URL in production, which works automatically

## Troubleshooting

### Build Fails

```bash
# Check build logs
heroku logs --tail

# Common issues:
# - Missing environment variables
# - Build errors in frontend/backend
# - Missing dependencies
```

### App Crashes on Start

```bash
# Check runtime logs
heroku logs --tail

# Common issues:
# - Missing MONGODB_URI
# - Missing JWT_SECRET
# - Port binding issues (should be automatic)
```

### Frontend Not Loading

- Check that `heroku-postbuild` completed successfully
- Verify `server/public/` contains built files
- Check browser console for errors

### WebSocket Not Connecting

- Ensure you're using HTTPS (Heroku provides this automatically)
- Check that Socket.IO is using secure WebSocket (`wss://`)
- Verify CORS settings allow your domain

## Updating the App

```bash
# Make changes and commit
git add .
git commit -m "Your changes"

# Deploy updates
git push heroku main
```

## Environment Variables Management

View all config vars:
```bash
heroku config
```

Set a config var:
```bash
heroku config:set KEY=value
```

Remove a config var:
```bash
heroku config:unset KEY
```

## Scaling

Scale your app (if needed):
```bash
# Scale to 2 dynos
heroku ps:scale web=2
```

## Database Management

Access MongoDB shell (if using MongoDB Atlas):
```bash
# Use MongoDB Compass or mongo shell with your connection string
```

## Cost

- **Free tier**: Limited hours per month, app sleeps after 30 min inactivity
- **Hobby tier**: $7/month - always on, no sleeping
- **MongoDB Atlas**: Free tier available (512MB storage)

## Additional Resources

- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Heroku Environment Variables](https://devcenter.heroku.com/articles/config-vars)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)


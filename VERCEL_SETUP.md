# Vercel Environment Variables Setup

Your frontend is deployed on Vercel but needs environment variables to connect to the backend.

## Required Environment Variables

Set these in your Vercel project settings:

### 1. API Base URL
```
VITE_API_BASE_URL=https://document-mismatch-detection-api-267816589183.us-central1.run.app
```

### 2. WebSocket Base URL (Optional - will use API URL if not set)
```
VITE_WS_BASE_URL=wss://document-mismatch-detection-api-267816589183.us-central1.run.app
```

## How to Set Environment Variables in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `ocr-mvp-ui`
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar
5. Add the following variables:

   **Variable Name:** `VITE_API_BASE_URL`
   **Value:** `https://document-mismatch-detection-api-267816589183.us-central1.run.app`
   **Environment:** Select `Production`, `Preview`, and `Development` (or just `Production` if you want)

   **Variable Name:** `VITE_WS_BASE_URL`
   **Value:** `wss://document-mismatch-detection-api-267816589183.us-central1.run.app`
   **Environment:** Select `Production`, `Preview`, and `Development` (or just `Production` if you want)

6. Click **Save**
7. **Redeploy** your site:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Set environment variables
vercel env add VITE_API_BASE_URL production
# When prompted, enter: https://document-mismatch-detection-api-267816589183.us-central1.run.app

vercel env add VITE_WS_BASE_URL production
# When prompted, enter: wss://document-mismatch-detection-api-267816589183.us-central1.run.app

# Redeploy
vercel --prod
```

## Verify Environment Variables

After setting the variables and redeploying:

1. Check your site's network tab
2. API calls should go to: `https://document-mismatch-detection-api-267816589183.us-central1.run.app`
3. NOT to: `http://127.0.0.1:8000`

## Troubleshooting

### Environment variables not working?

1. **Make sure variable names start with `VITE_`** - Vite only exposes variables with this prefix
2. **Redeploy after adding variables** - Environment variables are baked into the build
3. **Check build logs** - Look for your variables in the build output
4. **Clear browser cache** - Old JavaScript might be cached

### Backend URL changed?

If you redeploy the backend and get a new URL:

1. Update `VITE_API_BASE_URL` in Vercel
2. Redeploy the frontend
3. Update `VITE_WS_BASE_URL` if using WebSockets

## Quick Setup Script

You can also use this one-liner (if you have Vercel CLI):

```bash
vercel env add VITE_API_BASE_URL production <<< "https://document-mismatch-detection-api-267816589183.us-central1.run.app" && \
vercel env add VITE_WS_BASE_URL production <<< "wss://document-mismatch-detection-api-267816589183.us-central1.run.app" && \
vercel --prod
```


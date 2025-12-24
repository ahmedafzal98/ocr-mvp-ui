# Fix Production Backend URL Issue

Your frontend is trying to connect to `http://127.0.0.1:8000` instead of your production backend.

## Quick Fix (Via Vercel Dashboard) - 5 minutes

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Click on your project: **ocr-mvp-ui**

### Step 2: Add Environment Variables
1. Click **Settings** tab (top navigation)
2. Click **Environment Variables** (left sidebar)
3. Add these two variables:

**Variable 1:**
- **Key:** `VITE_API_BASE_URL`
- **Value:** `https://document-mismatch-detection-api-267816589183.us-central1.run.app`
- **Environments:** Select ✅ Production (and optionally Preview, Development)
- Click **Save**

**Variable 2:**
- **Key:** `VITE_WS_BASE_URL`
- **Value:** `wss://document-mismatch-detection-api-267816589183.us-central1.run.app`
- **Environments:** Select ✅ Production (and optionally Preview, Development)
- Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **three dots (⋯)** menu
4. Click **Redeploy**
5. Wait for deployment to complete

### Step 4: Verify
1. Open your site: https://ocr-mvp-ui.vercel.app
2. Open browser DevTools → Network tab
3. Upload a document or make any API call
4. You should see requests going to: `https://document-mismatch-detection-api-267816589183.us-central1.run.app`
5. ✅ NOT to `http://127.0.0.1:8000`

## Alternative: Via Vercel CLI

If you have Vercel CLI installed:

```bash
cd /Users/mbp/ocr-mvp-ui
./scripts/set-vercel-env.sh
```

Then redeploy:
```bash
vercel --prod
```

## Why This Happened

Vite only exposes environment variables that start with `VITE_`. The frontend code has a fallback to `http://127.0.0.1:8000` for local development, which is what you're seeing because the environment variable isn't set in production.

## Important Notes

- ⚠️ **Environment variables are baked into the build** - You MUST redeploy after adding/updating them
- ✅ Variable names must start with `VITE_` to be accessible in the frontend
- 🔄 If you change backend URL, update these variables and redeploy

## Troubleshooting

**Still seeing localhost?**
1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
2. Check build logs in Vercel - verify variables are showing up
3. Make sure you selected the correct environment (Production) when adding variables
4. Verify the deployment you're looking at was built AFTER you added the variables


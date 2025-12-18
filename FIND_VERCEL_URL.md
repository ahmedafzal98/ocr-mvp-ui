# How to Find Your Vercel Frontend URL

## Quick Methods

### Method 1: Vercel Dashboard (Easiest)
1. Go to: **https://vercel.com/dashboard**
2. Sign in with your account
3. Find your project: **ocr-mvp-ui**
4. Click on the project
5. The deployment URL will be displayed at the top
6. It will look like: `https://ocr-mvp-ui.vercel.app` or `https://ocr-mvp-ui-[username].vercel.app`

### Method 2: Check Recent Deployments
1. Go to: **https://vercel.com/dashboard**
2. Click on **ocr-mvp-ui** project
3. Go to **Deployments** tab
4. Click on the latest deployment
5. The URL will be shown there

### Method 3: Using Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# List your projects
vercel ls

# Or get project info
vercel inspect
```

### Method 4: Check Your Email
- Vercel sends deployment notifications
- Check your email for deployment success messages
- The URL will be in the email

## Common URL Formats

Your Vercel URL will typically be one of these formats:
- `https://ocr-mvp-ui.vercel.app`
- `https://ocr-mvp-ui-[your-username].vercel.app`
- `https://ocr-mvp-ui-git-main-[your-username].vercel.app`

## After Finding the URL

Once you have your Vercel URL, make sure:

1. **Environment Variables are set in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add:
     - `VITE_API_BASE_URL` = `https://document-mismatch-detection-api-267816589183.us-central1.run.app`
     - `VITE_WS_BASE_URL` = `wss://document-mismatch-detection-api-267816589183.us-central1.run.app`
   
2. **Redeploy if needed:**
   - After setting environment variables, trigger a new deployment
   - Or push a commit to trigger auto-deployment

## Testing

After updating environment variables:
1. Visit your Vercel URL
2. Open browser console (F12)
3. Check that API requests go to the deployed backend
4. Test document upload functionality


# Frontend Redeployment Guide

## After Setting Environment Variables in Vercel

You've set the environment variables in Vercel. Now you need to redeploy to use them.

### Option 1: Redeploy via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project: **ocr-mvp-ui**
3. Go to **Deployments** tab
4. Find your latest deployment
5. Click the **three dots (⋯)** menu on the deployment
6. Click **Redeploy**
7. Wait for the deployment to complete (2-5 minutes)

### Option 2: Redeploy via Git Push

If your code is connected to Git:

1. Make a small change (or just commit the current changes)
2. Push to your main branch:
   ```bash
   git add .
   git commit -m "Update API configuration"
   git push origin main
   ```
3. Vercel will automatically deploy

### Option 3: Redeploy via Vercel CLI

```bash
cd /Users/mbp/ocr-mvp-ui
vercel --prod
```

## Files Changed (No manual redeploy needed - just commit/push)

All frontend files that need to be deployed:

- ✅ `src/config/api.js` - New centralized config file
- ✅ `src/services/apiService.js` - Updated to use centralized config
- ✅ `src/services/documentService.js` - Updated to use centralized config
- ✅ `src/contexts/AuthContext.jsx` - Updated to use centralized config
- ✅ `src/pages/Dashboard.jsx` - Updated to use centralized config
- ✅ `src/pages/DocumentReviewPage.jsx` - Fixed missing import
- ✅ `src/pages/UploadPage.jsx` - Updated to use centralized config
- ✅ `src/pages/ExportsPage.jsx` - Updated to use centralized config
- ✅ `src/pages/ReviewResultsPage.jsx` - Updated to use centralized config

## What Happens After Redeploy

1. Vercel reads the `VITE_API_BASE_URL` environment variable
2. Builds the frontend with the production backend URL
3. All API calls will go to: `https://document-mismatch-detection-api-267816589183.us-central1.run.app`
4. No more localhost URLs in production!

## Verify Deployment

After redeploy completes:

1. Visit your site: https://ocr-mvp-ui.vercel.app
2. Open browser DevTools → Console
3. You should NOT see warnings about localhost
4. Open DevTools → Network tab
5. Make an API call (e.g., login, fetch documents)
6. Check the request URL - it should be your production backend URL
7. ✅ Success if requests go to: `https://document-mismatch-detection-api-267816589183.us-central1.run.app`

## Troubleshooting

**Still seeing localhost?**
- Make sure you selected **Production** environment when adding the variable
- Make sure the deployment you're viewing was built AFTER you added the variable
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
- Check build logs in Vercel to verify the variable was included

**401 Errors?**
- Make sure your backend is running and accessible
- Check CORS settings in backend (should allow your Vercel domain)
- Verify authentication is working correctly


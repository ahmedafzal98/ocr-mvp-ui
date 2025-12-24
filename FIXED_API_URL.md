# ✅ Fixed: All API URLs Now Use Centralized Config

## What Was Fixed

I've centralized all API URL configuration into a single file (`src/config/api.js`) so all API calls use the same base URL consistently.

### Changes Made:

1. ✅ Created `src/config/api.js` - Centralized API configuration
2. ✅ Updated all service files to import from config:
   - `src/services/apiService.js`
   - `src/services/documentService.js`
   - `src/contexts/AuthContext.jsx`
3. ✅ Updated all page components to import from config:
   - `src/pages/Dashboard.jsx`
   - `src/pages/DocumentReviewPage.jsx`
   - `src/pages/UploadPage.jsx`
   - `src/pages/ExportsPage.jsx`
   - `src/pages/ReviewResultsPage.jsx`

### Benefits:

- ✅ **Single source of truth** - All URLs come from one place
- ✅ **Consistent configuration** - No more scattered hardcoded URLs
- ✅ **Better debugging** - Console warnings if localhost is used in production
- ✅ **Easier maintenance** - Change URL in one place, affects everywhere

## Next Step: Set Environment Variable in Vercel

**IMPORTANT:** You still need to set the environment variable in Vercel and redeploy!

### Quick Fix (5 minutes):

1. Go to https://vercel.com/dashboard
2. Select your project: **ocr-mvp-ui**
3. **Settings** → **Environment Variables**
4. Add:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://document-mismatch-detection-api-267816589183.us-central1.run.app`
   - **Environment:** ✅ Production
5. **Deployments** → Click **⋯** on latest deployment → **Redeploy**

### Verify After Redeploy:

1. Open browser DevTools → Console
2. Look for: `🔧 API Configuration:` log (in dev mode) or warning (in prod if wrong)
3. Check Network tab - requests should go to your production backend URL
4. ✅ NOT to `http://127.0.0.1:8000`

## The Config File

All files now import from `src/config/api.js`:

```javascript
import { API_BASE_URL, WS_BASE_URL } from "../config/api";
```

This ensures:
- ✅ Consistent URL usage across all files
- ✅ Automatic WebSocket URL derivation from API URL
- ✅ Helpful console warnings in production if misconfigured
- ✅ Easy to debug and maintain

## Testing Locally

For local development, the fallback `http://127.0.0.1:8000` will still work if you don't set `VITE_API_BASE_URL` in your local `.env` file.


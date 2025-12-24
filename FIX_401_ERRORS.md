# Fix 401 Unauthorized Errors

## Common Causes of 401 Errors

### 1. Missing or Invalid Token

**Symptom:** Getting 401 errors even after logging in

**Solution:**
- Check if token exists: Open browser DevTools → Application → Local Storage → Check for `auth_token`
- If token doesn't exist, log in again
- If token exists but still getting 401, the token might be expired (24 hours by default)

### 2. Backend Not Running (Local Development)

**Symptom:** 401 or connection errors when accessing pages locally

**Solution:**
```bash
# Start the backend server
cd /Users/mbp/ocr-mvp-ui/backend
uvicorn main:app --reload --log-level info

# Or use the script
cd /Users/mbp/ocr-mvp-ui
./scripts/start-backend.sh
```

### 3. Wrong API URL in Local Development

**Symptom:** Requests going to wrong URL

**Check:**
- Open browser DevTools → Network tab
- See what URL requests are going to
- Should be: `http://127.0.0.1:8000` for local development
- Should be: `https://document-mismatch-detection-api-267816589183.us-central1.run.app` for production

### 4. Token Not Being Sent in Headers

**Fixed:** All API calls now properly include the Authorization header

**How it works:**
- `apiService.js` - Axios interceptor automatically adds token
- Direct `fetch` calls - Manually add `Authorization: Bearer ${token}` header

### 5. Token Expired

**Symptom:** Was working, suddenly getting 401 errors

**Solution:**
- Log out and log back in
- Token expires after 24 hours by default
- The frontend should automatically redirect to login on 401

## How Authentication Flow Works

1. **Login Page** → User enters credentials
2. **AuthContext.login()** → Calls `/auth/login` endpoint
3. **Backend** → Returns JWT token
4. **Frontend** → Stores token in `localStorage` as `auth_token`
5. **All API calls** → Include token in `Authorization: Bearer <token>` header
6. **Backend** → Validates token on protected routes
7. **401 Response** → Frontend clears token and redirects to login

## Debugging 401 Errors

### Step 1: Check if Backend is Running

```bash
# Test backend health
curl http://127.0.0.1:8000/health

# Test auth endpoint (should work without auth)
curl http://127.0.0.1:8000/
```

### Step 2: Check Token in Browser

1. Open DevTools → Application → Local Storage
2. Look for `auth_token` key
3. If missing, log in again
4. If present, copy the value

### Step 3: Test Token Manually

```bash
# Replace YOUR_TOKEN with the token from localStorage
curl -H "Authorization: Bearer YOUR_TOKEN" http://127.0.0.1:8000/auth/me
```

Should return: `{"username":"admin","authenticated":true}`

### Step 4: Check Network Requests

1. Open DevTools → Network tab
2. Make a request that's failing
3. Check:
   - Request URL (should be correct)
   - Request Headers (should include `Authorization: Bearer ...`)
   - Response Status (401 = unauthorized)
   - Response Body (error message)

## Fixed Issues

✅ **DocumentReviewPage.jsx** - Added missing `API_BASE_URL` import
✅ All files now use centralized config from `src/config/api.js`
✅ 401 errors automatically redirect to login
✅ Token is properly included in all API requests

## Testing Locally

1. **Start Backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --log-level info
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Login:**
   - Go to http://localhost:5173/login
   - Use your admin credentials
   - Should redirect to dashboard

4. **Test Document Review:**
   - Navigate to a document
   - Should load without 401 errors
   - Check Network tab - requests should include Authorization header

## Production

- Make sure `VITE_API_BASE_URL` is set in Vercel
- Redeploy frontend after setting environment variable
- Backend should allow CORS from your Vercel domain
- Token should work the same way as local


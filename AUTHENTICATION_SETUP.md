# Authentication Setup Guide

## 🔒 Security Implementation Complete

All routes are now protected with JWT-based authentication. No patient data is accessible without login.

## Environment Variables Required

### Backend (Cloud Run)

Set these environment variables in your Cloud Run service:

```bash
# JWT Secret Key (REQUIRED - Generate a strong random key)
JWT_SECRET_KEY=your-very-strong-random-secret-key-here-min-32-characters

# Admin Credentials (REQUIRED - Change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here
```

**⚠️ IMPORTANT:** 
- Generate a strong `JWT_SECRET_KEY` (at least 32 characters, random)
- Change `ADMIN_PASSWORD` to a strong password
- Never commit these values to Git

### Frontend (Vercel)

No additional environment variables needed - uses existing `VITE_API_BASE_URL` and `VITE_WS_BASE_URL`.

## Quick Setup

### 1. Generate JWT Secret Key

```bash
# Option 1: Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Option 2: Using OpenSSL
openssl rand -base64 32
```

### 2. Set Backend Environment Variables

```bash
# Update Cloud Run service
gcloud run services update document-mismatch-detection-api \
  --region=us-central1 \
  --set-env-vars="JWT_SECRET_KEY=your-generated-key,ADMIN_USERNAME=admin,ADMIN_PASSWORD=your-secure-password"
```

Or use the provided script:

```bash
cd backend
./set-auth-env.sh
```

### 3. Deploy Backend

```bash
cd backend
./deploy.sh
```

### 4. Deploy Frontend

Frontend will auto-deploy on Vercel when you push to GitHub.

## How It Works

### Backend

1. **Login Endpoint**: `POST /auth/login`
   - Accepts username/password
   - Returns JWT token (valid for 24 hours)

2. **Protected Routes**: All API routes require `Authorization: Bearer <token>` header
   - `/documents/*` - Protected
   - `/clients/*` - Protected
   - `/exports/*` - Protected
   - `/matches/*` - Protected
   - `/stats/*` - Protected
   - `/ws/status` - Protected (WebSocket)

3. **Public Routes** (no auth required):
   - `/health` - Health check
   - `/health/db` - Database health check
   - `/auth/login` - Login endpoint
   - `/auth/me` - Get current user (requires auth)

### Frontend

1. **Login Page**: `/login` - Public access
2. **Protected Pages**: All other routes require authentication
   - Redirects to `/login` if not authenticated
   - Stores JWT token in localStorage
   - Automatically includes token in API requests
   - Handles token expiration (401 errors)

## Testing

### 1. Test Login

```bash
curl -X POST https://your-backend-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### 2. Test Protected Route (Without Token)

```bash
curl https://your-backend-url/documents/
```

Response: `401 Unauthorized`

### 3. Test Protected Route (With Token)

```bash
curl https://your-backend-url/documents/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Response: `200 OK` with documents list

## Security Features

✅ JWT-based authentication
✅ Token expiration (24 hours)
✅ Automatic token refresh on page load
✅ Protected API routes (401 on unauthorized)
✅ Protected frontend routes (redirect to login)
✅ Secure password storage (ready for hashing if needed)
✅ Environment variable-based configuration
✅ Automatic logout on 401 errors

## Default Credentials

**⚠️ CHANGE THESE IMMEDIATELY IN PRODUCTION!**

- Username: `admin` (set via `ADMIN_USERNAME`)
- Password: `admin123` (set via `ADMIN_PASSWORD`)

## Troubleshooting

### 401 Unauthorized Errors

1. Check that `JWT_SECRET_KEY` is set in Cloud Run
2. Verify token is included in request headers
3. Check token hasn't expired (24 hour validity)
4. Verify username/password are correct

### Frontend Not Redirecting to Login

1. Clear browser localStorage: `localStorage.removeItem('auth_token')`
2. Check browser console for errors
3. Verify `AuthProvider` wraps the app in `App.jsx`

### Backend Not Accepting Tokens

1. Verify `JWT_SECRET_KEY` matches between token creation and verification
2. Check backend logs for authentication errors
3. Ensure `python-jose[cryptography]` is installed

## Next Steps (Optional Enhancements)

- [ ] Add password hashing (bcrypt already included)
- [ ] Implement refresh tokens
- [ ] Add role-based access control (RBAC)
- [ ] Add rate limiting
- [ ] Add login attempt throttling
- [ ] Add audit logging for authentication events


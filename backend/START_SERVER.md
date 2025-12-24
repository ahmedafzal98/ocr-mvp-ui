# Starting the Backend Server

## Proper Logging Configuration

The logging is now properly configured to work with Uvicorn. To see all logs:

### Development (with reload)
```bash
cd backend
uvicorn main:app --reload --log-level info
```

### Development (with debug logs)
```bash
cd backend
uvicorn main:app --reload --log-level debug
```

### Production
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info
```

## Environment Variables

Set log level via environment variable:
```bash
export LOG_LEVEL=DEBUG  # or INFO, WARNING, ERROR
uvicorn main:app --reload
```

## What You'll See

With proper logging, you'll see:
- ✅ All API request/response logs
- ✅ Upload process logs
- ✅ Background task logs
- ✅ Database operation logs
- ✅ Error logs with full stack traces

## Troubleshooting

If logs still don't appear:
1. Make sure you're using `--log-level info` or `--log-level debug`
2. Check that `LOG_LEVEL` environment variable is set correctly
3. Ensure you're looking at the correct terminal (where uvicorn is running)


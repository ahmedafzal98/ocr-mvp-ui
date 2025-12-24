# Backend Debugging Guide

## Quick Debugging Methods

### Method 1: Using `print()` (Quick & Simple)
For quick debugging, you can use `print()` statements. These will appear in your terminal where you run `uvicorn`.

```python
print("🔍 Debug: Starting function")
print(f"📊 Debug: Variable value = {variable_name}")
print(f"❌ Debug: Error occurred = {error}")
```

**Pros:**
- Quick and easy
- Always visible in terminal
- No setup needed

**Cons:**
- Not structured
- Can't filter by level
- Harder to manage in production

### Method 2: Using `logger` (Recommended)
For better debugging, use the logging system. It's already configured in `main.py`.

#### How to use in any file:

1. **Import logger at the top of your file:**
```python
import logging
logger = logging.getLogger(__name__)
```

2. **Use different log levels:**
```python
# Debug - Detailed information for diagnosing problems
logger.debug("🔍 Detailed debug information: %s", variable)

# Info - General information about program execution
logger.info("✅ Operation completed successfully")

# Warning - Something unexpected happened but not an error
logger.warning("⚠️ Warning: This might be an issue")

# Error - Something went wrong
logger.error("❌ Error occurred: %s", error_message)

# Critical - Serious error that might stop the program
logger.critical("🚨 Critical error: %s", critical_error)
```

#### Examples:

```python
# In routes/documents.py or any route file
import logging
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_document(file: UploadFile):
    logger.info(f"📤 Received file: {file.filename}")
    
    try:
        # Your code here
        logger.debug(f"🔍 Processing file with size: {file.size}")
        result = process_file(file)
        logger.info(f"✅ File processed successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"❌ Error processing file: {str(e)}", exc_info=True)
        raise
```

```python
# In services/extraction_service.py or any service file
import logging
logger = logging.getLogger(__name__)

def extract_fields(text):
    logger.debug(f"🔍 Extracting fields from text (length: {len(text)})")
    
    fields = {}
    for field_name in field_list:
        value = extract_field(text, field_name)
        if value:
            logger.info(f"✅ Found {field_name}: {value}")
            fields[field_name] = value
        else:
            logger.debug(f"⏭️ Field {field_name} not found")
    
    logger.info(f"📊 Extracted {len(fields)} fields total")
    return fields
```

### Method 3: Conditional Debugging
You can add debug flags to control verbose logging:

```python
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"

if DEBUG_MODE:
    logger.debug("🔍 Detailed debug info: %s", detailed_data)
    print(f"Debug: {detailed_data}")
```

## Log Levels Explained

- **DEBUG**: Detailed information, typically of interest only when diagnosing problems
- **INFO**: Confirmation that things are working as expected
- **WARNING**: An indication that something unexpected happened
- **ERROR**: Due to a more serious problem, the software has not been able to perform some function
- **CRITICAL**: A serious error, indicating that the program itself may be unable to continue running

## Viewing Logs

### Local Development
When running with `uvicorn`, logs appear directly in your terminal:
```bash
cd backend
uvicorn main:app --reload
```

### Production (Cloud Run)
View logs in Google Cloud Console:
```bash
gcloud run services logs read document-mismatch-detection-api --region us-central1
```

## Tips

1. **Use emojis** (like 🔍, ✅, ❌) to make logs easier to scan
2. **Include context** in log messages (file names, IDs, etc.)
3. **Use `exc_info=True`** in `logger.error()` to include stack traces
4. **Set log level** in `.env` file: `LOG_LEVEL=DEBUG` or `LOG_LEVEL=INFO`

## Example: Complete Debugging Setup

```python
import logging
import os

logger = logging.getLogger(__name__)

def my_function(param1, param2):
    logger.info(f"🚀 Starting my_function with param1={param1}, param2={param2}")
    
    try:
        # Step 1
        logger.debug("Step 1: Processing...")
        result1 = process_step1(param1)
        logger.debug(f"Step 1 result: {result1}")
        
        # Step 2
        logger.debug("Step 2: Processing...")
        result2 = process_step2(result1, param2)
        logger.info(f"✅ Step 2 completed: {result2}")
        
        # Final
        final_result = combine_results(result1, result2)
        logger.info(f"✅ Function completed successfully: {final_result}")
        return final_result
        
    except ValueError as e:
        logger.warning(f"⚠️ Invalid input: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}", exc_info=True)
        raise
```


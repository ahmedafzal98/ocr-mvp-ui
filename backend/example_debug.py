"""
Example file showing how to debug in the backend.
This is just for reference - you can delete this file.
"""

import logging

# Step 1: Get a logger for your module
logger = logging.getLogger(__name__)

# Step 2: Use different log levels based on what you want to debug

def example_function(param1, param2):
    """Example function showing debugging techniques."""
    
    # INFO - General flow information
    logger.info(f"🚀 Starting example_function with param1={param1}")
    
    # DEBUG - Detailed information (only shows if log level is DEBUG)
    logger.debug(f"🔍 Detailed debug: param1 type={type(param1)}, param2={param2}")
    
    try:
        # Your code here
        result = param1 + param2
        
        # SUCCESS message
        logger.info(f"✅ Function completed successfully. Result: {result}")
        return result
        
    except Exception as e:
        # ERROR - Something went wrong (includes stack trace)
        logger.error(f"❌ Error in example_function: {e}", exc_info=True)
        raise


# Quick print() method (also works, but less structured)
def quick_debug_example():
    """Quick debugging with print() - simpler but less structured."""
    print("🔍 Debug: Starting function")
    print(f"📊 Debug: Variable value = some_value")
    
    try:
        # Your code
        result = "success"
        print(f"✅ Debug: Success! Result = {result}")
    except Exception as e:
        print(f"❌ Debug: Error = {e}")


# Example in a route handler
from fastapi import APIRouter

router = APIRouter()

@router.get("/example")
async def example_route():
    """Example route with debugging."""
    logger.info("📥 Received GET request to /example")
    
    try:
        # Process request
        logger.debug("🔍 Processing request...")
        data = {"message": "Hello"}
        logger.info(f"✅ Request processed successfully: {data}")
        return data
    except Exception as e:
        logger.error(f"❌ Error processing request: {e}", exc_info=True)
        raise


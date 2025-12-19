"""
Client dataset upload routes.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import ClientProfile
from auth import get_current_user
import pandas as pd
from io import BytesIO
from datetime import datetime
from dateutil import parser as date_parser
import logging
import traceback

router = APIRouter(prefix="/clients", tags=["clients"])
logger = logging.getLogger(__name__)


@router.post("/upload")
async def upload_client_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload client dataset (CSV or XLSX).
    
    Expected columns: name, dob, doa (optional)
    Optimized for large files (4000+ rows) using bulk operations.
    """
    # Validate file type
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_ext not in {'.csv', '.xlsx', '.xls'}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: CSV, XLSX, XLS"
        )
    
    try:
        logger.info(f"📤 Starting dataset upload: {file.filename} ({file_ext})")
        
        # Read file content
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)
        logger.info(f"📊 File size: {file_size_mb:.2f} MB")
        
        # Parse based on file type
        logger.info("📖 Parsing file...")
        if file_ext == '.csv':
            try:
                df = pd.read_csv(BytesIO(file_content), encoding='utf-8')
            except UnicodeDecodeError:
                logger.info("⚠️ UTF-8 failed, trying Latin-1...")
                df = pd.read_csv(BytesIO(file_content), encoding='latin-1')
        else:
            df = pd.read_excel(BytesIO(file_content), engine='openpyxl')
        
        logger.info(f"✅ Parsed {len(df)} rows, {len(df.columns)} columns")
        
        # Normalize column names (case-insensitive, strip whitespace, replace spaces with underscores)
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        logger.info(f"📋 Columns found: {', '.join(df.columns.tolist())}")
        
        # Map common name column variations to standard 'name' column
        name_column_variations = [
            'name', 'client_name', 'patient_name', 'full_name', 
            'clientname', 'patientname', 'fullname'
        ]
        
        # Find the name column (check variations)
        name_column = None
        for col in df.columns:
            if col in name_column_variations:
                name_column = col
                break
        
        if not name_column:
            # Try partial match (contains 'name' but not 'first' or 'last')
            for col in df.columns:
                if 'name' in col and 'first' not in col and 'last' not in col:
                    name_column = col
                    logger.info(f"✅ Found name column by partial match: {col}")
                    break
        
        if not name_column:
            raise HTTPException(
                status_code=400,
                detail=f"Could not find name column. Expected one of: {', '.join(name_column_variations)}. Found columns: {', '.join(df.columns.tolist())}"
            )
        
        logger.info(f"✅ Using name column: '{name_column}'")
        
        # Map common date column variations
        dob_column = None
        doa_column = None
        
        dob_variations = ['dob', 'date_of_birth', 'birth_date', 'birthdate', 'dateofbirth']
        doa_variations = ['doa', 'date_of_accident', 'accident_date', 'incident_date', 'dateofaccident']
        
        for col in df.columns:
            if col in dob_variations:
                dob_column = col
            elif col in doa_variations:
                doa_column = col
        
        if dob_column:
            logger.info(f"✅ Found DOB column: '{dob_column}'")
        if doa_column:
            logger.info(f"✅ Found DOA column: '{doa_column}'")
        
        # Clean and prepare data
        logger.info("🧹 Cleaning data...")
        # Remove rows with empty/invalid names (using the found name column)
        df = df[df[name_column].notna()]
        df[name_column] = df[name_column].astype(str).str.strip()
        df = df[df[name_column].str.len() > 0]
        df = df[~df[name_column].str.lower().isin(['nan', 'none', 'null', ''])]
        
        logger.info(f"✅ After cleaning: {len(df)} valid rows")
        
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid rows found. Please ensure the dataset has at least one row with a valid 'name' column."
            )
        
        # Get existing client names (case-insensitive) for duplicate checking
        logger.info("🔍 Checking for existing clients...")
        existing_names = set(
            db.query(func.lower(ClientProfile.name)).all()
        )
        existing_names = {name[0] for name in existing_names if name[0]}
        logger.info(f"📊 Found {len(existing_names)} existing clients in database")
        
        # Prepare bulk insert data
        logger.info("📝 Preparing bulk insert...")
        clients_to_insert = []
        
        for idx, row in df.iterrows():
            name = str(row[name_column]).strip()
            name_lower = name.lower()
            
            # Skip if already exists (case-insensitive)
            if name_lower in existing_names:
                continue
            
            # Parse dates (using found columns or default names)
            dob = None
            doa = None
            
            if dob_column and pd.notna(row.get(dob_column)):
                try:
                    dob = date_parser.parse(str(row[dob_column]), fuzzy=True).date()
                except Exception as e:
                    logger.debug(f"Could not parse DOB for row {idx}: {e}")
                    pass
            elif 'dob' in df.columns and pd.notna(row.get('dob')):
                try:
                    dob = date_parser.parse(str(row['dob']), fuzzy=True).date()
                except Exception as e:
                    logger.debug(f"Could not parse DOB for row {idx}: {e}")
                    pass
            
            if doa_column and pd.notna(row.get(doa_column)):
                try:
                    doa = date_parser.parse(str(row[doa_column]), fuzzy=True).date()
                except Exception as e:
                    logger.debug(f"Could not parse DOA for row {idx}: {e}")
                    pass
            elif 'doa' in df.columns and pd.notna(row.get('doa')):
                try:
                    doa = date_parser.parse(str(row['doa']), fuzzy=True).date()
                except Exception as e:
                    logger.debug(f"Could not parse DOA for row {idx}: {e}")
                    pass
            
            clients_to_insert.append(ClientProfile(
                name=name,
                dob=dob,
                doa=doa
            ))
            
            # Add to existing set to avoid duplicates within the same upload
            existing_names.add(name_lower)
        
        logger.info(f"✅ Prepared {len(clients_to_insert)} new clients for insertion")
        
        # Bulk insert in batches (1000 at a time for better performance)
        inserted_count = 0
        batch_size = 1000
        
        for i in range(0, len(clients_to_insert), batch_size):
            batch = clients_to_insert[i:i + batch_size]
            db.bulk_save_objects(batch)
            inserted_count += len(batch)
            logger.info(f"💾 Inserted batch {i//batch_size + 1}: {len(batch)} clients (Total: {inserted_count})")
        
        db.commit()
        logger.info(f"✅ Successfully uploaded {inserted_count} client profiles")
        
        return {
            "message": f"Successfully uploaded {inserted_count} client profiles",
            "total_rows": len(df),
            "inserted": inserted_count,
            "skipped": len(df) - inserted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        error_trace = traceback.format_exc()
        logger.error(f"❌ Error processing file: {error_msg}")
        logger.error(f"📋 Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=400 if "400" in error_msg.lower() or "missing" in error_msg.lower() or "invalid" in error_msg.lower() else 500,
            detail=f"Error processing file: {error_msg}"
        )


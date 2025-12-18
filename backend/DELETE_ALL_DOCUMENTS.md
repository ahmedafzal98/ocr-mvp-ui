# Delete All Documents Endpoint

## Overview
Created a DELETE endpoint to delete all documents and their related data, while preserving the client dataset.

## Backend Endpoint

### `DELETE /documents/all`

**Description:**
Deletes all documents and automatically deletes related data through CASCADE relationships:
- ✅ All documents
- ✅ All extracted fields (CASCADE)
- ✅ All matches (CASCADE)
- ✅ All mismatches (CASCADE)
- ✅ All exports (CASCADE)
- ❌ Client dataset (client_profiles) - **NOT deleted**

**Response:**
```json
{
  "message": "All documents and related data deleted successfully",
  "deleted": {
    "documents": 10,
    "extracted_fields": 40,
    "matches": 10,
    "mismatches": 2,
    "exports": 5
  },
  "note": "Client dataset (client_profiles) was NOT deleted"
}
```

**Implementation:**
- Uses SQLAlchemy CASCADE delete (configured in models)
- Counts records before deletion for response
- Logs deletion process
- Returns detailed deletion summary

## Frontend Integration

### Dashboard Button

**Location:** Dashboard page (top left, before upload buttons)

**Features:**
- 🗑️ Red "Delete All Documents" button
- Confirmation dialog before deletion
- Disabled when no documents exist
- Loading state during deletion
- Success/error messages
- Auto-refreshes document list after deletion

**Confirmation Dialog:**
```
⚠️ WARNING: This will delete ALL documents, extracted fields, matches, and exports.

The client dataset will NOT be deleted.

Are you sure you want to continue?
```

## Database Relationships

The CASCADE delete is configured in the models:

```python
# Document model
extracted_fields = relationship("ExtractedField", cascade="all, delete-orphan")
matches = relationship("Match", cascade="all, delete-orphan")
mismatches = relationship("Mismatch", cascade="all, delete-orphan")
exports = relationship("Export", cascade="all, delete-orphan")

# Foreign keys with CASCADE
ExtractedField.doc_id = ForeignKey("documents.id", ondelete="CASCADE")
Match.doc_id = ForeignKey("documents.id", ondelete="CASCADE")
Mismatch.doc_id = ForeignKey("documents.id", ondelete="CASCADE")
Export.doc_id = ForeignKey("documents.id", ondelete="CASCADE")
```

This ensures that when a document is deleted, all related records are automatically deleted.

## Safety Features

1. **Confirmation Dialog**: Prevents accidental deletion
2. **Client Dataset Protection**: Explicitly does NOT delete client_profiles
3. **Error Handling**: Catches and displays errors
4. **Logging**: Backend logs all deletion operations
5. **Transaction Safety**: Uses database transactions with rollback on error

## Usage

1. Navigate to Dashboard
2. Click "🗑️ Delete All Documents" button (top left)
3. Confirm deletion in dialog
4. Wait for deletion to complete
5. See success message with deletion summary
6. Document list automatically refreshes

## What Gets Deleted

✅ **Deleted:**
- All documents
- All extracted fields
- All matches
- All mismatches
- All exports

❌ **NOT Deleted:**
- Client profiles (dataset)
- Database schema
- Other system data

## Example Response

```json
{
  "message": "All documents and related data deleted successfully",
  "deleted": {
    "documents": 5,
    "extracted_fields": 20,
    "matches": 5,
    "mismatches": 1,
    "exports": 3
  },
  "note": "Client dataset (client_profiles) was NOT deleted"
}
```

## Testing

1. Upload some documents
2. Upload a client dataset
3. Click "Delete All Documents"
4. Confirm deletion
5. Verify:
   - Documents are deleted
   - Client dataset still exists
   - Document list is empty
   - Batch cards show 0 counts

The endpoint is ready to use! 🎉


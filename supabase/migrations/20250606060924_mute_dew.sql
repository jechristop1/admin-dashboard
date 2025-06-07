/*
  # Add indexes to user_documents table

  1. Changes
    - Add index for user_id lookups
    - Add compound unique index for user_id and file_path
    - Add index for status filtering
    - Add index for document type filtering
    - Add index for upload date sorting

  2. Performance
    - Improves query performance for common operations
    - Ensures unique file paths per user
    - Optimizes filtering and sorting operations
*/

-- Add index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id 
ON user_documents(user_id);

-- Add compound unique index for user_id and file_path
CREATE UNIQUE INDEX IF NOT EXISTS user_documents_user_id_file_path_key 
ON user_documents(user_id, file_path);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_user_documents_status
ON user_documents(status);

-- Add index for document type filtering
CREATE INDEX IF NOT EXISTS idx_user_documents_document_type
ON user_documents(document_type);

-- Add index for upload date sorting
CREATE INDEX IF NOT EXISTS idx_user_documents_upload_date
ON user_documents(upload_date DESC);
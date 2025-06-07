/*
  # Add indexes to user_documents table

  1. Changes
    - Add index for user_id lookups
    - Add unique compound index for user_id and file_path
    - Add index for status filtering
    - Add index for document type filtering
    - Add index for upload date sorting

  2. Performance
    - Improves query performance for common operations
    - Ensures uniqueness of file paths per user
    - Optimizes filtering and sorting operations
*/

-- Add index for user_id lookups if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'user_documents' 
    AND indexname = 'idx_user_documents_user_id'
  ) THEN
    CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
  END IF;
END $$;

-- Add unique compound index for user_id and file_path if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'user_documents' 
    AND indexname = 'user_documents_user_id_file_path_key'
  ) THEN
    CREATE UNIQUE INDEX user_documents_user_id_file_path_key ON user_documents(user_id, file_path);
  END IF;
END $$;

-- Add index for status filtering if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'user_documents' 
    AND indexname = 'idx_user_documents_status'
  ) THEN
    CREATE INDEX idx_user_documents_status ON user_documents(status);
  END IF;
END $$;

-- Add index for document type filtering if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'user_documents' 
    AND indexname = 'idx_user_documents_document_type'
  ) THEN
    CREATE INDEX idx_user_documents_document_type ON user_documents(document_type);
  END IF;
END $$;

-- Add index for upload date sorting if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'user_documents' 
    AND indexname = 'idx_user_documents_upload_date'
  ) THEN
    CREATE INDEX idx_user_documents_upload_date ON user_documents(upload_date DESC);
  END IF;
END $$;
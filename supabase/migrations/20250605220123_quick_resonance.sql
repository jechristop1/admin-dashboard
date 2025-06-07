/*
  # Add document analysis columns

  1. Changes
    - Add 'analysis' column to user_documents table to store document analysis results
    - Add 'document_type' column to user_documents table to categorize documents
    
  2. Details
    - analysis: TEXT column to store the analysis results
    - document_type: TEXT column with a check constraint for valid document types
*/

DO $$ 
BEGIN
  -- Add analysis column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'analysis'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN analysis text;
  END IF;

  -- Add document_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN document_type text;
  END IF;

  -- Add check constraint for document_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'user_documents' AND constraint_name = 'user_documents_document_type_check'
  ) THEN
    ALTER TABLE user_documents 
    ADD CONSTRAINT user_documents_document_type_check 
    CHECK (document_type IN ('c&p_exam', 'rating_decision', 'dbq', 'other'));
  END IF;
END $$;
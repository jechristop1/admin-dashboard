/*
  # Enable vector extension and fix document analysis

  1. Changes
    - Enable vector extension
    - Add status column to user_documents
    - Add error handling improvements
*/

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add status column to user_documents
ALTER TABLE user_documents 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'
CHECK (status IN ('pending', 'processing', 'completed', 'error'));

-- Add error_message column
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS error_message text;
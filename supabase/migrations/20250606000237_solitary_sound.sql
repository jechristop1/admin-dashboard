/*
  # Optimize Document Analysis Pipeline

  1. Changes
    - Add HNSW index for faster vector similarity search
    - Optimize match_document_chunks function
    - Add status tracking for document processing
    - Add error handling fields

  2. Security
    - Maintain existing RLS policies
    - Add security definer to functions
*/

-- Drop existing indexes to recreate with optimized settings
DROP INDEX IF EXISTS document_chunks_embedding_idx;
DROP INDEX IF EXISTS document_chunks_embedding_cosine_idx;

-- Create optimized HNSW index for vector similarity search
CREATE INDEX document_chunks_embedding_hnsw_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (
  m = 16,
  ef_construction = 64
);

-- Update match_document_chunks function with improved performance
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  embedding vector(1536),
  chunk_index int,
  total_chunks int,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use CTE for better query planning
  WITH user_docs AS (
    SELECT id 
    FROM user_documents 
    WHERE user_id = p_user_id
  )
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.embedding,
    dc.chunk_index,
    dc.total_chunks,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE dc.document_id IN (SELECT id FROM user_docs)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector(1536), float, int, uuid) 
TO authenticated;

-- Ensure status column exists with correct constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_documents' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE user_documents 
    ADD COLUMN status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'error'));
  END IF;
END $$;

-- Ensure error_message column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_documents' 
    AND column_name = 'error_message'
  ) THEN
    ALTER TABLE user_documents
    ADD COLUMN error_message text;
  END IF;
END $$;
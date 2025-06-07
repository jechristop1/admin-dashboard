/*
  # Fix match_document_chunks function overloading

  1. Changes
    - Drop all existing versions of match_document_chunks function
    - Create new function with explicit parameter types
    - Add proper table joins and column references
    - Improve query performance with CTE
*/

-- Drop all versions of the function
DROP FUNCTION IF EXISTS match_document_chunks(vector(1536), float, int, uuid);
DROP FUNCTION IF EXISTS match_document_chunks(vector(1536), int, float);
DROP FUNCTION IF EXISTS match_document_chunks(vector(1536), float, int);

-- Create updated function with explicit parameter types
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count integer,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  embedding vector(1536),
  chunk_index integer,
  total_chunks integer,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_docs AS (
    SELECT user_documents.id 
    FROM user_documents 
    WHERE user_documents.user_id = p_user_id
  )
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.embedding,
    document_chunks.chunk_index,
    document_chunks.total_chunks,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  INNER JOIN user_docs ON user_docs.id = document_chunks.document_id
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
/*
  # Fix ambiguous ID column reference

  1. Changes
    - Update match_document_chunks function to properly qualify id column references
    - Ensure all table columns are properly qualified with their table names
  
  2. Security
    - No changes to RLS policies
    - No changes to table permissions
*/

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  min_similarity float DEFAULT 0.8
) RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > min_similarity
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
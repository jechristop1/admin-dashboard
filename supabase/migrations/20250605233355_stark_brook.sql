/*
  # Add document chunks matching function

  1. Changes
    - Creates a function to match document chunks using vector similarity search
    - Supports user-specific document access through RLS
    - Returns relevant chunks ordered by similarity score

  2. Security
    - Function respects RLS policies through user_documents join
    - Only returns chunks from documents owned by the specified user

  3. Performance
    - Uses vector cosine similarity for efficient matching
    - Includes limit and threshold parameters for tuning
*/

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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.embedding,
    dc.chunk_index,
    dc.total_chunks,
    (dc.embedding <#> query_embedding) * -1 AS similarity
  FROM document_chunks dc
  JOIN user_documents ud ON dc.document_id = ud.id
  WHERE (dc.embedding <#> query_embedding) * -1 > match_threshold
    AND ud.user_id = p_user_id
  ORDER BY (dc.embedding <#> query_embedding) * -1 DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector(1536), float, int, uuid) TO authenticated;

-- Create index for embedding similarity search if not exists
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = '100');
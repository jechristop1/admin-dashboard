/*
  # Add match_document_chunks function
  
  1. New Functions
    - `match_document_chunks`: PostgreSQL function for semantic search
      - Takes query embedding, threshold, count, and user_id as parameters
      - Returns matching document chunks with similarity scores
      - Joins with user_documents to ensure user data privacy
      - Uses vector similarity search with pgvector
  
  2. Security
    - Function is accessible to authenticated users through RLS policies
    - Results filtered by user_id to ensure data privacy
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
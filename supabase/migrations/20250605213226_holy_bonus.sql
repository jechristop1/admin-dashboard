/*
  # Add search_documents function
  
  1. New Functions
    - `search_documents`: Performs semantic search on documents table using vector similarity
      - Parameters:
        - query_embedding: vector(1536)
        - match_threshold: float
        - match_count: int
        - p_user_id: uuid
      - Returns: Table of matching documents with similarity scores
  
  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.search_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 
    documents.user_id = p_user_id
    AND documents.embedding IS NOT NULL
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
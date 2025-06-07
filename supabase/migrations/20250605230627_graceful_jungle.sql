/*
  # Fix document search functionality

  1. Changes
    - Recreate search_documents function with better error handling
    - Add proper type casting for user_id
    - Ensure proper index usage
    - Add better documentation
*/

-- Recreate the search_documents function with better error handling
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
#variable_conflict use_column
BEGIN
  -- Validate inputs
  IF query_embedding IS NULL THEN
    RAISE EXCEPTION 'query_embedding cannot be null';
  END IF;

  IF match_threshold < 0 OR match_threshold > 1 THEN
    RAISE EXCEPTION 'match_threshold must be between 0 and 1';
  END IF;

  IF match_count < 1 THEN
    RAISE EXCEPTION 'match_count must be greater than 0';
  END IF;

  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 
    -- Include both user's documents and global knowledge base documents
    (documents.user_id = p_user_id OR documents.user_id IS NULL)
    AND documents.embedding IS NOT NULL
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    -- Prioritize user's documents slightly over global ones
    CASE WHEN documents.user_id = p_user_id THEN 1 ELSE 0 END DESC,
    similarity DESC
  LIMIT match_count;
END;
$$;
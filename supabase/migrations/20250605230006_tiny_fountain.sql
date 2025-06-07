/*
  # Update document search functionality

  1. Changes
    - Create improved search_documents function
    - Update RLS policies for document access
  
  2. Security
    - Enable RLS on documents table
    - Update policy for authenticated users to access own and global documents
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read own and global documents" ON documents;

-- Update the search_documents function to include both user and global documents
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

-- Ensure proper RLS policies are in place
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create the updated read policy
CREATE POLICY "Users can read own and global documents"
ON documents
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR user_id IS NULL
);
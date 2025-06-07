/*
  # Optimize vector search with reduced memory usage
  
  1. Changes
    - Replace IVFFlat index with cosine distance index
    - Optimize document chunks search function
    - Add basic document_id index
    
  2. Security
    - Maintain existing security policies
    - Grant execute permission to authenticated users
*/

-- Add basic index for document_id lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
ON document_chunks(document_id);

-- Create optimized vector similarity search index
CREATE INDEX IF NOT EXISTS document_chunks_embedding_cosine_idx
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
#variable_conflict use_column
BEGIN
  -- Use materialized to reduce memory usage
  CREATE TEMPORARY TABLE matching_docs ON COMMIT DROP AS
  SELECT id FROM user_documents WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.embedding,
    dc.chunk_index,
    dc.total_chunks,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE dc.document_id IN (SELECT id FROM matching_docs)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector(1536), float, int, uuid) 
TO authenticated;
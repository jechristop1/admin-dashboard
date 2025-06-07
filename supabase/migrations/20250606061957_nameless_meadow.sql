-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES user_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policy for reading embeddings
CREATE POLICY "Users can read embeddings of their documents"
ON document_embeddings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_documents
    WHERE user_documents.id = document_embeddings.document_id
    AND user_documents.user_id = auth.uid()
  )
);

-- Create HNSW index for fast similarity search
CREATE INDEX document_embeddings_embedding_idx ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (
  m = 16,
  ef_construction = 64
);

-- Create index for document_id lookups
CREATE INDEX idx_document_embeddings_document_id ON document_embeddings(document_id);

-- Create search cache table
CREATE TABLE IF NOT EXISTS search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  embedding vector(1536),
  results jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on cache
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for cache access
CREATE POLICY "Users can access their own search cache"
ON search_cache
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create index for cache lookups
CREATE INDEX idx_search_cache_user_query ON search_cache(user_id, query);
CREATE INDEX idx_search_cache_created_at ON search_cache(created_at);

-- Function to match documents with caching
CREATE OR REPLACE FUNCTION match_documents(
  query_text text,
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.8,
  max_cache_age interval DEFAULT interval '1 hour'
)
RETURNS TABLE (
  document_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  query_embedding vector(1536);
  cached_results jsonb;
BEGIN
  -- Check cache first
  SELECT results INTO cached_results
  FROM search_cache
  WHERE 
    user_id = auth.uid()
    AND query = query_text
    AND created_at > (now() - max_cache_age)
  ORDER BY created_at DESC
  LIMIT 1;

  IF cached_results IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      (value->>'document_id')::uuid,
      value->>'content',
      (value->>'similarity')::float,
      (value->>'metadata')::jsonb
    FROM jsonb_array_elements(cached_results);
  ELSE
    -- Generate embedding for query
    SELECT embedding INTO query_embedding
    FROM supabase_functions.http((
      'POST',
      'https://api.openai.com/v1/embeddings',
      ARRAY[('Authorization', 'Bearer ' || current_setting('app.settings.openai_key'))],
      'application/json',
      json_build_object(
        'model', 'text-embedding-3-small',
        'input', query_text
      )::text
    ));

    -- Perform similarity search
    RETURN QUERY
    WITH matches AS (
      SELECT
        de.document_id,
        de.content,
        1 - (de.embedding <=> query_embedding) as similarity,
        de.metadata
      FROM document_embeddings de
      JOIN user_documents ud ON de.document_id = ud.id
      WHERE 
        ud.user_id = auth.uid()
        AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
      ORDER BY de.embedding <=> query_embedding
      LIMIT match_count
    )
    SELECT * FROM matches;

    -- Cache results
    INSERT INTO search_cache (user_id, query, embedding, results)
    SELECT 
      auth.uid(),
      query_text,
      query_embedding,
      jsonb_agg(
        jsonb_build_object(
          'document_id', document_id,
          'content', content,
          'similarity', similarity,
          'metadata', metadata
        )
      )
    FROM matches;
  END IF;
END;
$$;
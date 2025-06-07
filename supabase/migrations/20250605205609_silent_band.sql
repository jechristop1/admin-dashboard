/*
  # Create Knowledge Base Tables

  1. New Tables
    - `documents`: Stores training documents and their embeddings
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `embedding` (vector)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
    
  2. Security
    - Enable RLS on `documents` table
    - Add policy for authenticated users to read documents
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create a GiST index for faster similarity searches
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read access to all authenticated users"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to search documents by similarity
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector,
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 5
) RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
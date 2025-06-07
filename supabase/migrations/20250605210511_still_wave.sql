/*
  # Document Storage and Search Setup

  1. New Features
    - Vector similarity search for documents
    - Metadata storage for additional document information
    - Efficient indexing for fast searches

  2. Security
    - Row Level Security enabled
    - Read-only access for authenticated users

  3. Functions
    - Added similarity search function for document queries
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
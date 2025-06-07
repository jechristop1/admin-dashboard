/*
  # Add document chunks table

  1. New Tables
    - `document_chunks`: Stores chunked document content with embeddings
      - `id` (uuid, primary key)
      - `document_id` (uuid, references user_documents)
      - `content` (text)
      - `embedding` (vector)
      - `chunk_index` (integer)
      - `total_chunks` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on document_chunks table
    - Add policy for authenticated users to read their own chunks
*/

CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  chunk_index integer NOT NULL,
  total_chunks integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own document chunks
CREATE POLICY "Users can read own document chunks"
  ON document_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_documents
      WHERE user_documents.id = document_chunks.document_id
      AND user_documents.user_id = auth.uid()
    )
  );

-- Create index for document_id lookups
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- Create index for embedding similarity search
CREATE INDEX document_chunks_embedding_idx ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = '100');
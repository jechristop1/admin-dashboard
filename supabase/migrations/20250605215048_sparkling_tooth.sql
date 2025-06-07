/*
  # Add file storage support
  
  1. New Tables
    - `user_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (bigint)
      - `mime_type` (text)
      - `upload_date` (timestamptz)
      - `url` (text)
  
  2. Security
    - Enable RLS on user_documents table
    - Add policies for authenticated users
*/

-- Create user_documents table
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  url text NOT NULL,
  UNIQUE(user_id, file_path)
);

-- Enable RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert own documents"
ON user_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own documents"
ON user_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
ON user_documents
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
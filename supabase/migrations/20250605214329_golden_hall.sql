/*
  # Update documents table policies

  1. Security
    - Enable RLS on documents table
    - Add policies for authenticated users to:
      - Create their own documents
      - Read their own documents and global documents
      - Update their own documents
      - Delete their own documents
*/

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can read own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Create new policies
CREATE POLICY "Users can insert own documents"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can read own and global documents"
ON documents
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR user_id IS NULL
);

CREATE POLICY "Users can update own documents"
ON documents
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete own documents"
ON documents
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);
/*
  # Add user-specific document management
  
  1. Changes
    - Add user_id column to documents table
    - Update RLS policies for user-specific access
    - Add foreign key constraint to users table
  
  2. Security
    - Enable RLS
    - Add policies for user-specific CRUD operations
*/

-- Add user_id column
ALTER TABLE documents 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing RLS policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON documents;

-- Create new RLS policies for user-specific access
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
-- Add analysis and document_type columns to user_documents
ALTER TABLE user_documents 
ADD COLUMN IF NOT EXISTS analysis text,
ADD COLUMN IF NOT EXISTS document_type text;

-- Create index for document type
CREATE INDEX IF NOT EXISTS idx_user_documents_document_type 
ON user_documents(document_type);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can insert own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can read own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON user_documents;

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
/*
  # Add INSERT policy for user_documents table

  1. Changes
    - Add INSERT policy for user_documents table to allow authenticated users to insert their own documents
    
  2. Security
    - Ensures users can only insert documents where user_id matches their auth.uid()
    - Maintains data isolation between users
*/

-- Drop the existing policy if it exists (to avoid conflicts)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_documents' 
    AND policyname = 'Users can insert own documents'
  ) THEN
    DROP POLICY "Users can insert own documents" ON public.user_documents;
  END IF;
END $$;

-- Create the INSERT policy with proper checks
CREATE POLICY "Users can insert own documents" 
ON public.user_documents
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);
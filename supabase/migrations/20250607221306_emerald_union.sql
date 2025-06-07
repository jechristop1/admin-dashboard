-- Create admin function to delete knowledge base documents
-- This function bypasses RLS policies and enforces admin-only access

CREATE OR REPLACE FUNCTION public.delete_knowledge_base_document(p_document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admins (by email domain) to run this function
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email LIKE '%@forwardassisthq.com'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Delete the global knowledge base document (where user_id IS NULL)
  DELETE FROM documents 
  WHERE id = p_document_id 
  AND user_id IS NULL;

  -- Return true if a row was deleted, false otherwise
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_knowledge_base_document(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_knowledge_base_document(uuid) IS 'Admin function to delete global knowledge base documents, bypassing RLS policies';
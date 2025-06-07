-- Create a comprehensive admin function that bypasses RLS for message access
-- This function will be used by the admin dashboard to view all user messages

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_session_messages_admin(uuid);

-- Create admin function to get messages with RLS bypass
CREATE OR REPLACE FUNCTION public.get_session_messages_admin(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  role text,
  content text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email LIKE '%@forwardassisthq.com'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all messages for the session, bypassing RLS
  -- Using SECURITY DEFINER allows this function to access data regardless of RLS
  RETURN QUERY
  SELECT 
    m.id,
    m.session_id,
    m.role,
    m.content,
    m.created_at
  FROM messages m
  WHERE m.session_id = p_session_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_session_messages_admin(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_session_messages_admin(uuid) IS 'Admin function to retrieve all messages for a specific chat session, bypassing RLS policies';

-- Also create a function to verify admin access
CREATE OR REPLACE FUNCTION public.verify_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email LIKE '%@forwardassisthq.com'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_access() TO authenticated;
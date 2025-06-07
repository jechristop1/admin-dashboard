/*
  # Fix get_session_messages function for chat log viewer

  1. Function Updates
    - Drop and recreate get_session_messages function
    - Fix admin authentication check
    - Ensure proper message retrieval
    - Add better error handling

  2. Security
    - Maintain admin-only access
    - Proper authentication validation
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_session_messages(uuid);

-- Recreate the function with proper admin checks and message retrieval
CREATE OR REPLACE FUNCTION public.get_session_messages(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  role text,
  content text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Return all messages for the session (including system messages for completeness)
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
GRANT EXECUTE ON FUNCTION public.get_session_messages(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_session_messages(uuid) IS 'Admin function to retrieve all messages for a specific chat session';
-- Create function to get messages for a specific session (admin only)
CREATE OR REPLACE FUNCTION get_session_messages(p_session_id uuid)
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
  -- Check if the current user is an admin (has @forwardassisthq.com email)
  IF NOT (auth.jwt() ->> 'email' LIKE '%@forwardassisthq.com') THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

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
GRANT EXECUTE ON FUNCTION get_session_messages(uuid) TO authenticated;

-- Also create a policy to allow admins to read all messages directly
CREATE POLICY "Admin users can read all messages"
ON messages
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' LIKE '%@forwardassisthq.com'
);
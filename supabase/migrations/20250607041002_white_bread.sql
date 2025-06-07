-- Create function to get all chat sessions with user info and message counts (admin only)
CREATE OR REPLACE FUNCTION get_all_chat_sessions()
RETURNS TABLE (
  id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  user_email text,
  message_count bigint
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
    cs.id,
    cs.title,
    cs.created_at,
    cs.updated_at,
    cs.user_id,
    COALESCE(u.email, 'Unknown')::text as user_email,
    COALESCE(msg_counts.message_count, 0) as message_count
  FROM chat_sessions cs
  LEFT JOIN auth.users u ON cs.user_id = u.id
  LEFT JOIN (
    SELECT 
      session_id,
      COUNT(*) as message_count
    FROM messages
    WHERE role != 'system'
    GROUP BY session_id
  ) msg_counts ON cs.id = msg_counts.session_id
  ORDER BY cs.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_chat_sessions() TO authenticated;
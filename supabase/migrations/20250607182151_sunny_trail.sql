/*
  # Fix get_all_chat_sessions function type mismatch

  1. Function Updates
    - Drop and recreate the `get_all_chat_sessions` function
    - Fix the return type for `user_email` column to match auth.users.email type
    - Ensure all column types align with actual database schema

  2. Changes Made
    - Change `user_email character varying(255)` to `user_email text` in RETURNS TABLE
    - This resolves the "structure of query does not match function result type" error
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_all_chat_sessions();

-- Recreate the function with correct return types
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
  RETURN QUERY
  SELECT 
    cs.id,
    cs.title,
    cs.created_at,
    cs.updated_at,
    cs.user_id,
    COALESCE(au.email, 'Unknown')::text as user_email,
    COALESCE(msg_counts.message_count, 0) as message_count
  FROM chat_sessions cs
  LEFT JOIN auth.users au ON cs.user_id = au.id
  LEFT JOIN (
    SELECT 
      session_id,
      COUNT(*) as message_count
    FROM messages
    GROUP BY session_id
  ) msg_counts ON cs.id = msg_counts.session_id
  ORDER BY cs.updated_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_chat_sessions() TO authenticated;
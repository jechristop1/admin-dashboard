/*
  # Create Public Users View for Admin Dashboard

  1. New Views
    - `users` view in public schema
      - `id` (uuid, references auth.users.id)
      - `email` (text, from auth.users.email)
      - `created_at` (timestamp, from auth.users.created_at)
      - `updated_at` (timestamp, from auth.users.updated_at)
      - `raw_user_meta_data` (jsonb, from auth.users.raw_user_meta_data)
      - `raw_app_meta_data` (jsonb, from auth.users.raw_app_meta_data)

  2. Security
    - Enable RLS on the view
    - Add policy for admin users (@forwardassisthq.com) to read user data
    - Ensure data privacy and access control

  3. Purpose
    - Allows PostgREST to join user_documents with user information
    - Provides necessary user data for admin dashboard functionality
    - Enables proper relationships between public schema tables and auth.users
*/

-- Create the users view in the public schema
CREATE OR REPLACE VIEW public.users AS
SELECT 
  id,
  email,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
FROM auth.users;

-- Enable RLS on the view
ALTER VIEW public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin users to read all user data
CREATE POLICY "Admin users can read all user data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- Only allow access to users with @forwardassisthq.com email addresses
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@forwardassisthq.com'
    )
  );

-- Create admin functions for dashboard queries
CREATE OR REPLACE FUNCTION public.get_all_user_documents()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  file_name text,
  file_path text,
  file_size bigint,
  mime_type text,
  url text,
  document_type text,
  status text,
  analysis text,
  error_message text,
  upload_date timestamptz,
  user_email text
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

  RETURN QUERY
  SELECT 
    ud.id,
    ud.user_id,
    ud.file_name,
    ud.file_path,
    ud.file_size,
    ud.mime_type,
    ud.url,
    ud.document_type,
    ud.status,
    ud.analysis,
    ud.error_message,
    ud.upload_date,
    u.email as user_email
  FROM user_documents ud
  JOIN public.users u ON ud.user_id = u.id
  ORDER BY ud.upload_date DESC;
END;
$$;

-- Create function to get all chat sessions with user info
CREATE OR REPLACE FUNCTION public.get_all_chat_sessions()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  user_email text,
  message_count bigint
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

  RETURN QUERY
  SELECT 
    cs.id,
    cs.user_id,
    cs.title,
    cs.created_at,
    cs.updated_at,
    u.email as user_email,
    COALESCE(msg_count.count, 0) as message_count
  FROM chat_sessions cs
  JOIN public.users u ON cs.user_id = u.id
  LEFT JOIN (
    SELECT 
      session_id, 
      COUNT(*) as count 
    FROM messages 
    WHERE role != 'system'
    GROUP BY session_id
  ) msg_count ON cs.id = msg_count.session_id
  ORDER BY cs.created_at DESC;
END;
$$;

-- Create function to get messages for a specific session (admin only)
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

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_user_documents() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_chat_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_messages(uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.users IS 'Public view of auth.users for admin dashboard access with RLS protection';
COMMENT ON FUNCTION public.get_all_user_documents() IS 'Admin function to retrieve all user documents with user email information';
COMMENT ON FUNCTION public.get_all_chat_sessions() IS 'Admin function to retrieve all chat sessions with user info and message counts';
COMMENT ON FUNCTION public.get_session_messages(uuid) IS 'Admin function to retrieve all messages for a specific chat session';
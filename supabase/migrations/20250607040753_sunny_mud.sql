/*
  # Fix get_all_user_documents function type mismatch

  1. Changes
    - Drop and recreate the get_all_user_documents function
    - Change user_email column type from character varying(255) to text
    - Ensure all returned types match expected frontend types

  2. Security
    - Maintain existing admin-only access restrictions
    - Keep RLS policies intact
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_all_user_documents();

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION get_all_user_documents()
RETURNS TABLE (
  id uuid,
  file_name text,
  file_size bigint,
  mime_type text,
  document_type text,
  status text,
  analysis text,
  error_message text,
  upload_date timestamptz,
  url text,
  user_id uuid,
  user_email text
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
    ud.id,
    ud.file_name,
    ud.file_size,
    ud.mime_type,
    ud.document_type,
    ud.status,
    ud.analysis,
    ud.error_message,
    ud.upload_date,
    ud.url,
    ud.user_id,
    COALESCE(u.email, 'Unknown')::text as user_email
  FROM user_documents ud
  LEFT JOIN auth.users u ON ud.user_id = u.id
  ORDER BY ud.upload_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_user_documents() TO authenticated;
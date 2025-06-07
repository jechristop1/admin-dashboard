/*
  # Fix get_all_user_documents function data type mismatch

  1. Function Updates
    - Drop and recreate the `get_all_user_documents` function
    - Fix the 13th column data type from character varying(255) to text
    - Ensure all returned columns match expected types

  2. Changes
    - Cast email column to text type to match expected return type
    - Maintain all existing functionality while fixing type mismatch
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_all_user_documents();

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION get_all_user_documents()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  file_name text,
  file_path text,
  file_size bigint,
  mime_type text,
  upload_date timestamptz,
  url text,
  analysis text,
  document_type text,
  status text,
  error_message text,
  user_email text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ud.id,
    ud.user_id,
    ud.file_name,
    ud.file_path,
    ud.file_size,
    ud.mime_type,
    ud.upload_date,
    ud.url,
    ud.analysis,
    ud.document_type,
    ud.status,
    ud.error_message,
    CAST(u.email AS text) as user_email,
    u.created_at,
    u.updated_at,
    u.raw_user_meta_data,
    u.raw_app_meta_data
  FROM user_documents ud
  LEFT JOIN users u ON ud.user_id = u.id
  ORDER BY ud.upload_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_user_documents() TO authenticated;
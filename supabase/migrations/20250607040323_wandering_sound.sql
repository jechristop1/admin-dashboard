/*
  # Create users view for admin dashboard

  1. Changes
    - Create a public users view that references auth.users
    - Add proper permissions for admin access
    - Enable PostgREST to understand the relationship

  2. Security
    - View is read-only
    - Access controlled through function-based security
*/

-- Create a public users view that references auth.users
CREATE OR REPLACE VIEW public.users AS
SELECT 
  id,
  email,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
FROM auth.users;

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.users TO authenticated;

-- Create a security definer function to check admin access
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user's email ends with @forwardassisthq.com
  RETURN (
    SELECT CASE 
      WHEN auth.jwt() ->> 'email' LIKE '%@forwardassisthq.com' THEN true
      ELSE false
    END
  );
END;
$$;

-- Create a function to get user documents with user info (admin only)
CREATE OR REPLACE FUNCTION public.get_all_user_documents()
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
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
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
    ud.upload_date,
    ud.url,
    ud.analysis,
    ud.document_type,
    ud.status,
    ud.error_message,
    u.email as user_email
  FROM user_documents ud
  LEFT JOIN auth.users u ON ud.user_id = u.id
  ORDER BY ud.upload_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_user_documents() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
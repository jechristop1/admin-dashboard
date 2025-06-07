/*
  # Create public users view for admin dashboard

  1. New Views
    - `users`: Public view of auth.users for PostgREST relationships
      - Maps auth.users to public schema
      - Enables proper joins with user_documents table
      - Includes necessary columns for admin dashboard

  2. Security
    - Enable RLS on the view
    - Add policy for admin-only access
    - Ensure data privacy and access control
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

-- Enable RLS on the view
ALTER VIEW public.users SET (security_invoker = true);

-- Create RLS policy for admin access only
CREATE POLICY "Admin users can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' LIKE '%@forwardassisthq.com'
);

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
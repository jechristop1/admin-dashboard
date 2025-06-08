/*
  # Fix Admin Permission Errors for System Messages

  1. Security
    - Create admin function to check permissions safely
    - Add RLS policy for system_messages that uses the admin function
    - Remove direct users table access from frontend

  2. Functions
    - Create is_admin() function that safely checks admin status
    - Update system_messages policies to use this function
*/

-- Create a secure function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user has an @forwardassisthq.com email
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email LIKE '%@forwardassisthq.com'
  );
END;
$$;

-- Drop existing system_messages policies if they exist
DROP POLICY IF EXISTS "Admin users can manage system messages" ON system_messages;

-- Create new RLS policies for system_messages using the safe admin function
CREATE POLICY "Admin users can view system messages"
  ON system_messages FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin users can insert system messages"
  ON system_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can update system messages"
  ON system_messages FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can delete system messages"
  ON system_messages FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Grant execute permission on the is_admin function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
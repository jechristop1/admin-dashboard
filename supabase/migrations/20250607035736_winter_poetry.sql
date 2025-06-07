/*
  # Create public users view for admin dashboard

  1. New Views
    - `users` view in public schema
      - `id` (uuid, references auth.users.id)
      - `email` (text, from auth.users.email)
      - `created_at` (timestamp, from auth.users.created_at)

  2. Security
    - Enable RLS on the view
    - Add policy for admin users to read user data

  3. Purpose
    - Allows PostgREST to join user_documents with user information
    - Provides necessary user data for admin dashboard functionality
*/

-- Create a view in the public schema that references auth.users
CREATE OR REPLACE VIEW public.users AS
SELECT 
  id,
  email,
  created_at,
  updated_at
FROM auth.users;

-- Enable RLS on the view
ALTER VIEW public.users SET (security_invoker = true);

-- Create policy to allow admin users to read user data
CREATE POLICY "Admin users can read user data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- Only allow users with @forwardassisthq.com email addresses
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@forwardassisthq.com'
    )
  );
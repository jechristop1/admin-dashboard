/*
  # Update Messages Table RLS Policies

  1. Changes
    - Add proper RLS policies for the messages table to allow authenticated users to:
      - Insert messages into their own chat sessions
      - Read messages from their own chat sessions
      - Delete messages from their own chat sessions

  2. Security
    - Ensures users can only access messages from chat sessions they own
    - Validates session ownership through the chat_sessions table
*/

-- First ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON messages;

-- Create comprehensive RLS policies
CREATE POLICY "Users can create messages in their sessions"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in their sessions"
ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages in their sessions"
ON messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);
/*
  # Fix Foreign Key Constraints

  1. Changes
    - Remove redundant foreign key constraint on messages table
    - Keep only the constraint with ON DELETE CASCADE

  2. Security
    - No changes to existing RLS policies
    - No changes to existing table structures
*/

-- Drop the redundant foreign key constraint
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_session_id_fkey;

-- Note: We're keeping the existing fk_session constraint which has ON DELETE CASCADE
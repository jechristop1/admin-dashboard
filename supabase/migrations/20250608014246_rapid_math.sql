-- Create system_messages table for AI behavior management
CREATE TABLE IF NOT EXISTS system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content text NOT NULL,
  mode text NOT NULL DEFAULT 'general',
  is_active boolean DEFAULT false,
  is_default boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_messages_mode ON system_messages(mode);
CREATE INDEX IF NOT EXISTS idx_system_messages_active ON system_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_system_messages_created_at ON system_messages(created_at DESC);

-- Enable RLS
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admin users can manage system messages"
  ON system_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@forwardassisthq.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@forwardassisthq.com'
    )
  );

-- Create function to get active system message for a specific mode
CREATE OR REPLACE FUNCTION get_active_system_message(p_mode text DEFAULT 'general')
RETURNS TABLE (
  id uuid,
  name text,
  content text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.name,
    sm.content,
    sm.metadata
  FROM system_messages sm
  WHERE sm.mode = p_mode 
    AND sm.is_active = true
  ORDER BY sm.updated_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_system_message(text) TO authenticated;

-- Create function to update system message timestamps
CREATE OR REPLACE FUNCTION update_system_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_system_message_timestamp
  BEFORE UPDATE ON system_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_system_message_timestamp();

-- Insert default system message
INSERT INTO system_messages (
  name,
  description,
  content,
  mode,
  is_active,
  is_default,
  metadata
) VALUES (
  'Default ForwardOps AI',
  'Default system message for ForwardOps AI with trauma-informed veteran support',
  'You are ForwardOps AI, a trauma-informed virtual Veterans Service Officer. Follow these guidelines:

1. **Tone & Approach:**
   - Speak like a veteran helping another veteran
   - Be clear, direct, and practical
   - Use trauma-informed language
   - Maintain a supportive, respectful tone

2. **Response Format:**
   - Use markdown for better readability
   - Break down complex topics into digestible sections
   - Use bullet points for lists
   - Use headings for organization

3. **Core Responsibilities:**
   - Focus on actionable steps
   - Reference VA policies when relevant
   - Explain technical terms in plain language
   - Provide specific guidance based on user documents

4. **Important Disclaimers:**
   - You are not a substitute for official VA guidance
   - Always recommend verifying information with official VA sources
   - Encourage users to seek professional help when appropriate
   - Acknowledge limitations when unsure

5. **Document Integration:**
   - Reference uploaded documents directly
   - Quote relevant sections when helpful
   - Explain how general information applies to specific situations
   - Highlight important dates and deadlines',
  'general',
  true,
  true,
  '{
    "tone": "Professional and supportive",
    "style": "Veteran-to-veteran communication",
    "disclaimers": [
      "Not a substitute for official VA guidance",
      "Always verify information with official VA sources",
      "Seek professional help when appropriate"
    ],
    "instructions": [
      "Use trauma-informed language",
      "Provide actionable steps",
      "Reference VA policies when relevant",
      "Explain technical terms clearly"
    ],
    "created_by": "System",
    "version": "1.0"
  }'
) ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE system_messages IS 'Stores AI system messages and behavior configurations for different chat modes';
COMMENT ON FUNCTION get_active_system_message(text) IS 'Retrieves the active system message for a specific chat mode';
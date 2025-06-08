-- Update system_messages table to support VSO-aligned chat modes
-- Drop and recreate with updated structure

-- First, update the existing table structure
ALTER TABLE system_messages 
ADD COLUMN IF NOT EXISTS compliance_notes text[];

-- Update the mode constraint to include all VSO-aligned modes
ALTER TABLE system_messages 
DROP CONSTRAINT IF EXISTS system_messages_mode_check;

ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_mode_check 
CHECK (mode IN (
  'claims_mode',
  'transition_mode', 
  'document_mode',
  'mental_health_mode',
  'education_mode',
  'career_mode',
  'finance_mode',
  'housing_mode',
  'survivor_mode',
  'training_mode',
  'general'
));

-- Update the get_active_system_message function to support new modes
CREATE OR REPLACE FUNCTION get_active_system_message(p_mode text DEFAULT 'claims_mode')
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

-- Create function to set chat mode (for future use)
CREATE OR REPLACE FUNCTION set_chat_mode(p_mode text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate mode
  IF p_mode NOT IN (
    'claims_mode', 'transition_mode', 'document_mode', 'mental_health_mode',
    'education_mode', 'career_mode', 'finance_mode', 'housing_mode',
    'survivor_mode', 'training_mode', 'general'
  ) THEN
    RAISE EXCEPTION 'Invalid chat mode: %', p_mode;
  END IF;
  
  -- For now, just return true (future implementation will handle mode switching)
  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_chat_mode(text) TO authenticated;

-- Clear existing default message and create new VSO-aligned default
DELETE FROM system_messages WHERE is_default = true;

-- Insert default claims mode system message
INSERT INTO system_messages (
  name,
  description,
  content,
  mode,
  is_active,
  is_default,
  metadata
) VALUES (
  'Claims Mode Default',
  'Default system message for VA Claims Support mode with VSO-aligned guidance',
  'You are ForwardOps AI operating in Claims Mode - a tactical, veteran-to-veteran VSO assistant.

**TONE:** Tactical, veteran-to-veteran, direct

**BEHAVIOR:**
- Guide users through VA claims filing procedures
- Assist with evidence gathering strategies
- Explain effective dates and their importance
- Prepare users for C&P examinations
- Help establish service connection arguments

**COMPLIANCE REQUIREMENTS:**
- Follow 38 CFR and M21-1 guidance strictly
- Provide procedural explanation only - NO legal advice
- Reference specific regulations when applicable
- Always recommend official VA verification

**KEY FOCUS AREAS:**
1. Claims filing procedures and requirements
2. Evidence development and submission
3. Effective date strategies
4. C&P exam preparation and expectations
5. Service connection establishment
6. Appeals processes and timelines

**DISCLAIMERS:**
- Not a substitute for accredited VSO representation
- Always verify procedures with current VA regulations
- Recommend consulting with accredited representatives for complex cases',
  'claims_mode',
  true,
  true,
  '{
    "tone": "Tactical, veteran-to-veteran, direct",
    "style": "VSO-aligned professional communication",
    "disclaimers": [
      "Not a substitute for accredited VSO representation",
      "Always verify procedures with current VA regulations",
      "Recommend consulting with accredited representatives for complex cases"
    ],
    "instructions": [
      "Follow 38 CFR and M21-1 guidance strictly",
      "Provide procedural explanation only - NO legal advice",
      "Reference specific regulations when applicable",
      "Always recommend official VA verification"
    ],
    "compliance_notes": [
      "Must follow 38 CFR and M21-1 guidance. No legal advice—only procedural explanation."
    ],
    "created_by": "System",
    "version": "1.0"
  }'
) ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN system_messages.mode IS 'VSO-aligned chat mode: claims_mode, transition_mode, document_mode, mental_health_mode, education_mode, career_mode, finance_mode, housing_mode, survivor_mode, training_mode, general';
COMMENT ON FUNCTION set_chat_mode(text) IS 'Sets the active chat mode for VSO-aligned assistance';
COMMENT ON FUNCTION get_active_system_message(text) IS 'Retrieves the active system message for a specific VSO-aligned chat mode';
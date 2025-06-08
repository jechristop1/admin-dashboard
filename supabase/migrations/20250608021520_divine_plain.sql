-- Create functions to support chat mode switching logic

-- Function to detect chat mode from user input
CREATE OR REPLACE FUNCTION detect_chat_mode_from_input(user_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  input_lower text;
  detected_mode text := 'claims_mode'; -- Default mode
BEGIN
  input_lower := lower(user_input);
  
  -- Education mode triggers
  IF input_lower ~ '(gi bill|education|school|college|vr&e|chapter 31|chapter 33|degree|university|student)' THEN
    detected_mode := 'education_mode';
  
  -- Document analysis mode triggers
  ELSIF input_lower ~ '(analyze|document|rating decision|c&p exam|dbq|what does this mean|explain this|review this)' THEN
    detected_mode := 'document_mode';
  
  -- Mental health mode triggers
  ELSIF input_lower ~ '(ptsd|mental health|depression|anxiety|mst|trauma|counseling|therapy|crisis|suicide)' THEN
    detected_mode := 'mental_health_mode';
  
  -- Transition mode triggers
  ELSIF input_lower ~ '(transition|tap|separation|civilian|job search|resume|interview|leaving military)' THEN
    detected_mode := 'transition_mode';
  
  -- Career mode triggers
  ELSIF input_lower ~ '(job|career|resume|interview|linkedin|employment|work|hiring|skills)' THEN
    detected_mode := 'career_mode';
  
  -- Finance mode triggers
  ELSIF input_lower ~ '(pay|compensation|money|budget|back pay|offset|financial|payment|disability pay)' THEN
    detected_mode := 'finance_mode';
  
  -- Housing mode triggers
  ELSIF input_lower ~ '(home loan|housing|mortgage|coe|buy house|va loan|real estate)' THEN
    detected_mode := 'housing_mode';
  
  -- Survivor mode triggers
  ELSIF input_lower ~ '(dic|survivor|dependent|champva|widow|spouse|children|death benefits)' THEN
    detected_mode := 'survivor_mode';
  
  -- Training mode triggers
  ELSIF input_lower ~ '(train|teach|learn|how does|explain|vso|course|training|help other veterans)' THEN
    detected_mode := 'training_mode';
  
  -- Claims mode triggers (explicit)
  ELSIF input_lower ~ '(claim|disability|rating|service connection|evidence|appeal|file claim)' THEN
    detected_mode := 'claims_mode';
  
  -- General mode triggers
  ELSIF input_lower ~ '(help|support|question|general|where do i start|what services)' THEN
    detected_mode := 'general';
  
  END IF;
  
  RETURN detected_mode;
END;
$$;

-- Function to get system message for detected mode
CREATE OR REPLACE FUNCTION get_system_message_for_mode(p_mode text)
RETURNS TABLE (
  id uuid,
  name text,
  content text,
  mode text,
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
    sm.mode,
    sm.metadata
  FROM system_messages sm
  WHERE sm.mode = p_mode 
    AND sm.is_active = true
  ORDER BY sm.updated_at DESC
  LIMIT 1;
  
  -- If no active message found for the mode, return general mode
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      sm.id,
      sm.name,
      sm.content,
      sm.mode,
      sm.metadata
    FROM system_messages sm
    WHERE sm.mode = 'general' 
      AND sm.is_active = true
    ORDER BY sm.updated_at DESC
    LIMIT 1;
  END IF;
  
  -- If still no message found, return claims_mode (default)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      sm.id,
      sm.name,
      sm.content,
      sm.mode,
      sm.metadata
    FROM system_messages sm
    WHERE sm.mode = 'claims_mode' 
      AND sm.is_active = true
    ORDER BY sm.updated_at DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Function to check if multiple modes might apply (for disambiguation)
CREATE OR REPLACE FUNCTION check_mode_ambiguity(user_input text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  input_lower text;
  possible_modes text[] := '{}';
BEGIN
  input_lower := lower(user_input);
  
  -- Check for education triggers
  IF input_lower ~ '(gi bill|education|school|college|vr&e|chapter 31|chapter 33)' THEN
    possible_modes := array_append(possible_modes, 'education_mode');
  END IF;
  
  -- Check for claims triggers
  IF input_lower ~ '(claim|disability|rating|service connection|evidence|appeal)' THEN
    possible_modes := array_append(possible_modes, 'claims_mode');
  END IF;
  
  -- Check for mental health triggers
  IF input_lower ~ '(ptsd|mental health|depression|anxiety|mst|trauma)' THEN
    possible_modes := array_append(possible_modes, 'mental_health_mode');
  END IF;
  
  -- Check for career triggers
  IF input_lower ~ '(job|career|resume|interview|employment|work)' THEN
    possible_modes := array_append(possible_modes, 'career_mode');
  END IF;
  
  -- Check for finance triggers
  IF input_lower ~ '(pay|compensation|money|budget|financial)' THEN
    possible_modes := array_append(possible_modes, 'finance_mode');
  END IF;
  
  -- Check for housing triggers
  IF input_lower ~ '(home loan|housing|mortgage|va loan)' THEN
    possible_modes := array_append(possible_modes, 'housing_mode');
  END IF;
  
  RETURN possible_modes;
END;
$$;

-- Function to generate mode disambiguation message
CREATE OR REPLACE FUNCTION generate_disambiguation_message(possible_modes text[])
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mode_labels text[] := '{}';
  mode_name text;
  disambiguation_msg text;
BEGIN
  -- Convert mode values to user-friendly labels
  FOREACH mode_name IN ARRAY possible_modes
  LOOP
    CASE mode_name
      WHEN 'claims_mode' THEN mode_labels := array_append(mode_labels, 'VA claims');
      WHEN 'education_mode' THEN mode_labels := array_append(mode_labels, 'education benefits');
      WHEN 'mental_health_mode' THEN mode_labels := array_append(mode_labels, 'mental health support');
      WHEN 'career_mode' THEN mode_labels := array_append(mode_labels, 'career guidance');
      WHEN 'finance_mode' THEN mode_labels := array_append(mode_labels, 'financial planning');
      WHEN 'housing_mode' THEN mode_labels := array_append(mode_labels, 'housing benefits');
      WHEN 'transition_mode' THEN mode_labels := array_append(mode_labels, 'transition support');
      WHEN 'survivor_mode' THEN mode_labels := array_append(mode_labels, 'survivor benefits');
      WHEN 'training_mode' THEN mode_labels := array_append(mode_labels, 'VSO training');
      ELSE mode_labels := array_append(mode_labels, 'general support');
    END CASE;
  END LOOP;
  
  -- Generate disambiguation message
  IF array_length(mode_labels, 1) = 2 THEN
    disambiguation_msg := format(
      'I can help you with both %s and %s. Which would you like to focus on first?',
      mode_labels[1], mode_labels[2]
    );
  ELSIF array_length(mode_labels, 1) > 2 THEN
    disambiguation_msg := format(
      'I can help you with several topics including %s. Which area would you like to focus on?',
      array_to_string(mode_labels, ', ')
    );
  ELSE
    disambiguation_msg := 'How can I help you today?';
  END IF;
  
  RETURN disambiguation_msg;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION detect_chat_mode_from_input(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_message_for_mode(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_mode_ambiguity(text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_disambiguation_message(text[]) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION detect_chat_mode_from_input(text) IS 'Analyzes user input to detect the most appropriate chat mode based on keywords and context';
COMMENT ON FUNCTION get_system_message_for_mode(text) IS 'Retrieves the active system message for a specific chat mode with fallback logic';
COMMENT ON FUNCTION check_mode_ambiguity(text) IS 'Checks if user input could apply to multiple chat modes, requiring disambiguation';
COMMENT ON FUNCTION generate_disambiguation_message(text[]) IS 'Generates a user-friendly message to help clarify which mode the user wants when multiple modes apply';
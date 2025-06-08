import { create } from 'zustand';
import { Message } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

const SYSTEM_PROMPT = 
  `You are ForwardOps AI. Follow these guidelines:

1. Format your responses using Markdown for better readability:
   - Use bullet points for lists
   - Use bold for important terms
   - Use headings for sections
   - Use code blocks for specific instructions
   - Use numbered lists for steps

2. Keep responses clear and concise:
   - Break down complex topics into digestible sections
   - Use short paragraphs
   - Highlight key points

3. Speak plainly like a VSO helping a fellow veteran
4. Focus on helping users understand VA claims, navigate benefits, and prepare for success
5. Always be supportive, clear, and accurate in your responses
6. When analyzing documents:
   - Provide a clear summary of key points
   - Highlight important dates and deadlines
   - Explain any technical terms
   - Suggest next steps or actions needed`;

// Assistant mode configuration
export const ASSISTANT_MODES = {
  general_support: {
    id: 'general_support',
    title: 'General Support Assistant',
    description: 'Provides general veteran support and guidance across all areas'
  },
  claims_mode: {
    id: 'claims_mode',
    title: 'Claims Assistant',
    description: 'Step-by-step guidance through VA disability claims'
  },
  transition_mode: {
    id: 'transition_mode',
    title: 'Transition & TAP Guidance',
    description: 'Supports veterans during the military-to-civilian transition'
  },
  document_mode: {
    id: 'document_mode',
    title: 'Document Review Assistant',
    description: 'Summarizes and interprets uploaded VA documents'
  },
  mental_health_mode: {
    id: 'mental_health_mode',
    title: 'Mental Health Support',
    description: 'Offers trauma-informed peer support and mental health claims guidance'
  },
  education_mode: {
    id: 'education_mode',
    title: 'Education & GI Bill Support',
    description: 'Explains how to access and use VA education benefits'
  },
  career_mode: {
    id: 'career_mode',
    title: 'Career & Job Readiness',
    description: 'Helps veterans prepare for employment'
  },
  finance_mode: {
    id: 'finance_mode',
    title: 'Financial Planning',
    description: 'Helps veterans understand disability compensation and budgeting'
  },
  housing_mode: {
    id: 'housing_mode',
    title: 'Housing & VA Home Loans',
    description: 'Explains VA loan process and housing considerations'
  },
  survivor_mode: {
    id: 'survivor_mode',
    title: 'Survivor & Dependent Benefits',
    description: 'Supports dependents and survivors with DIC and related benefits'
  },
  training_mode: {
    id: 'training_mode',
    title: 'VA Claims Training Assistant',
    description: 'Educates both veterans and staff on VA claims, benefits, and self-advocacy'
  }
} as const;

export type AssistantMode = keyof typeof ASSISTANT_MODES;

// Intelligent mode detection based on message content
const MODE_KEYWORDS = {
  claims_mode: [
    'claim', 'claims', 'file a claim', 'filing claim', 'disability claim', 'va claim',
    'rating', 'disability rating', 'service connection', 'c&p exam', 'compensation',
    'appeal', 'appeals', 'evidence', 'nexus', 'medical evidence', 'service records',
    'rating decision', 'denied claim', 'increase rating', 'secondary condition',
    'presumptive', 'direct service connection', 'aggravation', 'dbq'
  ],
  mental_health_mode: [
    'ptsd', 'mental health', 'depression', 'anxiety', 'trauma', 'mst', 'military sexual trauma',
    'counseling', 'therapy', 'psychiatric', 'psychological', 'suicide', 'crisis',
    'mental health claim', 'ptsd claim', 'therapy', 'counselor', 'psychiatrist'
  ],
  education_mode: [
    'gi bill', 'education', 'school', 'college', 'university', 'degree', 'vr&e',
    'chapter 31', 'chapter 33', 'vocational rehabilitation', 'education benefits',
    'tuition', 'bah', 'housing allowance', 'yellow ribbon', 'stem scholarship'
  ],
  career_mode: [
    'job', 'career', 'employment', 'work', 'resume', 'interview', 'hiring',
    'linkedin', 'skills', 'translate military experience', 'civilian job',
    'federal employment', 'usajobs', 'veteran preference'
  ],
  finance_mode: [
    'pay', 'payment', 'compensation', 'money', 'budget', 'financial', 'back pay',
    'effective date', 'offset', 'debt', 'overpayment', 'direct deposit',
    'disability pay', 'va pay', 'payment schedule'
  ],
  housing_mode: [
    'home loan', 'va loan', 'mortgage', 'house', 'housing', 'coe', 'certificate of eligibility',
    'real estate', 'buying house', 'refinance', 'property', 'home buying'
  ],
  survivor_mode: [
    'survivor', 'dependent', 'spouse', 'widow', 'widower', 'dic', 'dependency compensation',
    'champva', 'survivor benefits', 'death benefits', 'accrued benefits',
    'children benefits', 'family benefits'
  ],
  transition_mode: [
    'transition', 'separation', 'discharge', 'leaving military', 'civilian life',
    'tap', 'transition assistance', 'ets', 'retirement', 'getting out'
  ],
  document_mode: [
    'document', 'letter', 'rating decision', 'c&p exam', 'dbq', 'medical records',
    'analyze', 'review', 'explain', 'what does this mean', 'help me understand',
    'uploaded', 'attachment'
  ],
  training_mode: [
    'train', 'training', 'teach', 'learn', 'how does', 'explain how',
    'vso training', 'help other veterans', 'understand the process'
  ]
};

function detectModeFromMessage(message: string): AssistantMode | null {
  const lowerMessage = message.toLowerCase();
  
  // Check each mode's keywords
  for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        console.log(`Mode detected: ${mode} (matched keyword: "${keyword}")`);
        return mode as AssistantMode;
      }
    }
  }
  
  console.log('No specific mode detected, staying in current mode');
  return null;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentSessionId: string | null;
  currentMode: AssistantMode;
  addMessage: (message: Message) => Promise<void>;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  loadSession: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<string>;
  updateSessionTitle: (sessionId: string, messages: Message[]) => Promise<void>;
  switchMode: (mode: AssistantMode) => Promise<void>;
  detectAndSwitchMode: (message: string) => Promise<void>;
}

// Generate a unique ID for messages
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: generateId(),
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: new Date(),
    }
  ],
  isLoading: false,
  currentSessionId: null,
  currentMode: 'general_support', // Default mode

  addMessage: async (message) => {
    const { currentSessionId, messages } = get();
    const newMessage = {
      id: generateId(),
      timestamp: new Date(),
      ...message,
    };

    // Update local state
    const updatedMessages = [...messages, newMessage];
    set({ messages: updatedMessages });

    // Save to Supabase if we have a session
    if (currentSessionId) {
      try {
        await supabase.from('messages').insert({
          session_id: currentSessionId,
          role: message.role,
          content: message.content,
        });

        // Update title after user and assistant messages
        if (message.role === 'assistant') {
          await get().updateSessionTitle(currentSessionId, updatedMessages);
        }
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  },

  updateSessionTitle: async (sessionId: string, messages: Message[]) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-title`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) throw new Error('Failed to generate title');

      const data = await response.json();
      if (!data.title) throw new Error('No title received');

      // Update the session title in Supabase
      await supabase
        .from('chat_sessions')
        .update({ title: data.title })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error updating session title:', error);
    }
  },

  clearMessages: () => set((state) => ({
    messages: [state.messages[0]], // Keep the system prompt
    currentSessionId: null,
    // DON'T reset mode when clearing messages - keep current mode
  })),

  setLoading: (loading) => set({ isLoading: loading }),

  loadSession: async (sessionId) => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        })),
        currentSessionId: sessionId,
        // DON'T reset mode when loading session - keep current mode
      });
    } catch (error) {
      console.error('Error loading session:', error);
    }
  },

  createNewSession: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: 'New Conversation'
        })
        .select()
        .single();

      if (error) throw error;

      set({
        currentSessionId: session.id,
        // DON'T reset mode when creating new session - keep current mode
        messages: [
          {
            id: generateId(),
            role: 'system',
            content: SYSTEM_PROMPT,
            timestamp: new Date(),
          }
        ],
      });

      return session.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  switchMode: async (mode: AssistantMode) => {
    const currentMode = get().currentMode;
    
    console.log('switchMode called:', { from: currentMode, to: mode });
    
    if (currentMode === mode) {
      console.log('Mode already set, no change needed');
      return; // No change needed
    }
    
    console.log('Setting new mode:', mode);
    set({ currentMode: mode });
    
    // Add system message about mode switch
    const modeInfo = ASSISTANT_MODES[mode];
    const systemMessage: Message = {
      id: generateId(),
      role: 'system',
      content: `Switched to ${modeInfo.title}.`,
      timestamp: new Date(),
    };
    
    console.log('Adding system message for mode switch');
    await get().addMessage(systemMessage);
    
    console.log('Mode switch complete, new mode:', get().currentMode);
  },

  detectAndSwitchMode: async (message: string) => {
    console.log('Detecting mode for message:', message);
    
    const detectedMode = detectModeFromMessage(message);
    
    if (detectedMode && detectedMode !== get().currentMode) {
      console.log('Auto-switching to detected mode:', detectedMode);
      await get().switchMode(detectedMode);
    }
  },
}));
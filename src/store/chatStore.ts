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

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentSessionId: string | null;
  addMessage: (message: Message) => Promise<void>;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  loadSession: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<string>;
  updateSessionTitle: (sessionId: string, messages: Message[]) => Promise<void>;
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
}));
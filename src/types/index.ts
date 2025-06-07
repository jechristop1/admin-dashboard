export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

export type ChatSession = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
};

export type BattleBuddyResponse = {
  message: string;
  suggestedAction?: 'claims-wizard' | 'document-analyzer' | null;
};
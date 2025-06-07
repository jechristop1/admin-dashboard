import React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import { useChatStore } from '../../store/chatStore';
import { ChatSession } from '../../types';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';

interface UserDocument {
  id: string;
  file_name: string;
  file_path: string;
  url: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

interface GroupedSessions {
  [date: string]: ChatSession[];
}

const ChatHistory: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const { createNewSession, loadSession, currentSessionId } = useChatStore();
  
  useEffect(() => {
    loadChatSessions();
  }, []);
  
  const loadChatSessions = async () => {
    try {
      setError(null);
      console.log('Attempting to fetch chat sessions...');
      
      const { data, error: supabaseError } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (supabaseError) {
        console.error('Supabase error details:', supabaseError);
        throw new Error(`Failed to load chat sessions: ${supabaseError.message}`);
      }
      
      console.log('Successfully loaded chat sessions:', data?.length || 0);
      setSessions(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error loading chat sessions:', error);
      setError(errorMessage);
    }
  };
  
  const handleNewChat = async () => {
    try {
      await createNewSession();
      loadChatSessions();
    } catch (error) {
      console.error('Error creating new chat:', error);
      setError('Failed to create new chat session');
    }
  };
  
  const handleDeleteSession = async (sessionId: string) => {
    try {
      setError(null);
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('session_id', sessionId);
        
      if (messagesError) throw messagesError;
      
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);
        
      if (sessionError) throw sessionError;
      
      loadChatSessions();
      
      if (sessionId === currentSessionId) {
        useChatStore.setState({ 
          currentSessionId: null,
          messages: []
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete chat session');
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const formatDateKey = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to compare dates only
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      }).format(date);
    }
  };

  const groupSessionsByDate = (sessions: ChatSession[]): GroupedSessions => {
    return sessions.reduce((groups: GroupedSessions, session) => {
      const dateKey = formatDateKey(session.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
      return groups;
    }, {});
  };

  const toggleDayCollapse = (dateKey: string) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const groupedSessions = groupSessionsByDate(sessions);
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button
          variant="primary"
          fullWidth
          leftIcon={<Plus size={16} />}
          onClick={handleNewChat}
        >
          New Chat
        </Button>
        
        {error && (
          <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-2">
          {Object.entries(groupedSessions).map(([dateKey, dateSessions]) => {
            const isCollapsed = collapsedDays.has(dateKey);
            
            return (
              <div key={dateKey} className="mb-4">
                {/* Day Header */}
                <button
                  onClick={() => toggleDayCollapse(dateKey)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>{dateKey}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {dateSessions.length}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </div>
                </button>
                
                {/* Separator Line */}
                <div className="mx-3 mb-2 border-b border-gray-200"></div>
                
                {/* Sessions for this day */}
                {!isCollapsed && (
                  <div className="space-y-1">
                    {dateSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => loadSession(session.id)}
                        className={`
                          w-full text-left px-3 py-2 rounded-md flex items-center justify-between group
                          ${currentSessionId === session.id 
                            ? 'bg-[#0A2463] text-white' 
                            : 'text-gray-700 hover:bg-gray-100'}
                          transition-colors duration-200
                        `}
                      >
                        <div className="flex flex-col overflow-hidden flex-1">
                          <span className="truncate font-medium">
                            {session.title || 'New Conversation'}
                          </span>
                          <span className="text-xs opacity-75 mt-0.5">
                            {formatDate(session.created_at)}
                          </span>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className={`
                            p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0
                            ${currentSessionId === session.id 
                              ? 'hover:bg-[#061A47] text-white' 
                              : 'hover:bg-gray-200 text-gray-600'}
                          `}
                          aria-label="Delete conversation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {sessions.length === 0 && !error && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
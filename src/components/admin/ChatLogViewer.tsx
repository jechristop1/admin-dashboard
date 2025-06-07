import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  User, 
  Calendar, 
  Download, 
  Search, 
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { formatTimestamp, cleanMarkdown } from '../../utils/exportUtils';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email: string;
  message_count: number;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface GroupedSessions {
  [date: string]: ChatSession[];
}

const ChatLogViewer: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading chat sessions for admin...');

      // Get all chat sessions with user info and message counts
      const { data: sessionsData, error: sessionsError } = await supabase
        .rpc('get_all_chat_sessions');

      if (sessionsError) {
        console.error('Error loading chat sessions:', sessionsError);
        throw sessionsError;
      }

      console.log('Chat sessions loaded:', sessionsData?.length || 0);
      setSessions(sessionsData || []);
    } catch (error: any) {
      console.error('Error loading chat sessions:', error);
      setError(`Failed to load chat sessions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setMessagesLoading(true);
      setError(null);
      setMessages([]); // Clear previous messages immediately

      console.log('Loading messages for session:', sessionId);

      // First try the admin function
      const { data: messagesData, error: messagesError } = await supabase
        .rpc('get_session_messages', { p_session_id: sessionId });

      if (messagesError) {
        console.error('Error with admin function:', messagesError);
        
        // Fallback: Try direct query with admin policy
        console.log('Trying direct query as fallback...');
        const { data: directMessages, error: directError } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
          
        if (directError) {
          console.error('Direct query also failed:', directError);
          throw new Error(`Both admin function and direct query failed: ${messagesError.message}`);
        }
        
        console.log('Direct query succeeded:', directMessages?.length || 0);
        setMessages(directMessages || []);
      } else {
        console.log('Admin function succeeded:', messagesData?.length || 0);
        setMessages(messagesData || []);
      }
      
      // If still no messages, try one more approach
      if ((!messagesData || messagesData.length === 0) && (!messages || messages.length === 0)) {
        console.log('No messages found, trying alternative query...');
        
        // Try with service role to bypass all RLS
        const { data: serviceMessages, error: serviceError } = await supabase
          .from('messages')
          .select(`
            id,
            session_id,
            role,
            content,
            created_at
          `)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
          
        if (serviceError) {
          console.error('Service query failed:', serviceError);
        } else {
          console.log('Service query result:', serviceMessages?.length || 0);
          setMessages(serviceMessages || []);
        }
      }
      
    } catch (error: any) {
      console.error('Error loading messages:', error);
      setError(`Failed to load messages: ${error.message}`);
      setMessages([]); // Ensure messages are cleared on error
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSessionClick = async (session: ChatSession) => {
    console.log('Session clicked:', session.id, session.title);
    setSelectedSession(session);
    setShowSessionModal(true);
    setMessages([]); // Clear previous messages immediately
    setError(null); // Clear any previous errors
    
    // Load messages automatically
    await loadSessionMessages(session.id);
  };

  const formatDateKey = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
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

  const exportChatAsText = () => {
    if (!selectedSession || messages.length === 0) return;

    const displayMessages = messages.filter(msg => msg.role !== 'system');
    
    const title = `Forward Assist HQ - Chat Log Export\nSession: ${selectedSession.title || 'Untitled'}\nUser: ${selectedSession.user_email}\nExported: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })}`;

    const content = displayMessages.map(msg => {
      const timestamp = formatTimestamp(new Date(msg.created_at));
      const role = msg.role === 'user' ? 'User' : 'ForwardOps AI';
      const cleanContent = cleanMarkdown(msg.content);
      
      return `${role} (${timestamp}):\n${cleanContent}\n`;
    }).join('\n---\n\n');

    const footer = `\nThis chat log was exported from Forward Assist HQ on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })}.\n\nFor more information, visit Forward Assist HQ.`;

    const fullContent = `${title}\n\n${'='.repeat(60)}\n\n${content}\n\n${'='.repeat(60)}${footer}`;
    
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-log-${selectedSession.user_email.split('@')[0]}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportChatAsPDF = async () => {
    if (!selectedSession || messages.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;
    
    const addTextWithSpacing = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal', extraSpacing: number = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', fontStyle);
      
      const lines = pdf.splitTextToSize(text, maxWidth);
      const lineHeight = fontSize * 0.4;
      
      lines.forEach((line: string) => {
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += extraSpacing;
    };

    // Title
    const title = `Forward Assist HQ - Chat Log Export`;
    addTextWithSpacing(title, 16, 'bold', 10);
    
    // Session info
    addTextWithSpacing(`Session: ${selectedSession.title || 'Untitled'}`, 12, 'normal', 5);
    addTextWithSpacing(`User: ${selectedSession.user_email}`, 12, 'normal', 5);
    addTextWithSpacing(`Exported: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })}`, 12, 'normal', 15);
    
    // Separator
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    // Messages
    const displayMessages = messages.filter(msg => msg.role !== 'system');
    
    displayMessages.forEach((msg, index) => {
      if (index > 0) {
        yPosition += 8;
      }
      
      const timestamp = formatTimestamp(new Date(msg.created_at));
      const role = msg.role === 'user' ? 'User' : 'ForwardOps AI';
      const cleanContent = cleanMarkdown(msg.content);
      
      // Message header
      addTextWithSpacing(`${role} - ${timestamp}`, 12, 'bold', 6);
      
      // Message content
      addTextWithSpacing(cleanContent, 11, 'normal', 4);
    });
    
    // Footer
    yPosition += 15;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    const footer = `This chat log was exported from Forward Assist HQ on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })}.`;
    
    addTextWithSpacing(footer, 10, 'italic', 0);
    
    pdf.save(`chat-log-${selectedSession.user_email.split('@')[0]}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session => 
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedSessions = groupSessionsByDate(filteredSessions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chat Log Viewer</h2>
          <p className="text-gray-600 mt-1">
            Review user chat histories and export logs for analysis
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={loadChatSessions}
          leftIcon={<RefreshCw size={16} />}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by session title or user email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span>{sessions.length} total sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>{new Set(sessions.map(s => s.user_email)).size} unique users</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Chat Sessions List - Made Scrollable */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading chat sessions...
            </div>
          ) : Object.keys(groupedSessions).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare size={24} className="mx-auto mb-2 text-gray-400" />
              <p>No chat sessions found</p>
              {searchTerm && (
                <p className="text-sm mt-1">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSessions).map(([dateKey, dateSessions]) => {
                const isCollapsed = collapsedDays.has(dateKey);
                
                return (
                  <div key={dateKey}>
                    {/* Day Header */}
                    <button
                      onClick={() => toggleDayCollapse(dateKey)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight size={16} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-500" />
                        )}
                        <Calendar size={16} className="text-gray-500" />
                        <span className="font-medium text-gray-900">{dateKey}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {dateSessions.length} session{dateSessions.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                    
                    {/* Sessions for this day */}
                    {!isCollapsed && (
                      <div className="mt-2 space-y-2">
                        {dateSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {session.title || 'Untitled Session'}
                                  </h4>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <User size={14} />
                                      {session.user_email}
                                    </span>
                                    <span>{session.message_count} messages</span>
                                    <span>{formatTimestamp(new Date(session.created_at))}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSessionClick(session)}
                              leftIcon={<Eye size={16} />}
                            >
                              View Chat
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Session Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedSession.title || 'Untitled Session'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSession.user_email} • {formatTimestamp(new Date(selectedSession.created_at))} • {messages.filter(m => m.role !== 'system').length} messages loaded
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportChatAsText}
                  leftIcon={<Download size={16} />}
                  disabled={messages.length === 0}
                >
                  Export TXT
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportChatAsPDF}
                  leftIcon={<Download size={16} />}
                  disabled={messages.length === 0}
                >
                  Export PDF
                </Button>
                
                <button
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedSession(null);
                    setMessages([]);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={20} className="animate-spin mr-2" />
                  Loading messages...
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={20} />
                      <span className="font-medium">Error Loading Messages</span>
                    </div>
                    <p className="text-sm">{error}</p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      variant="primary"
                      onClick={() => loadSessionMessages(selectedSession.id)}
                      leftIcon={<RefreshCw size={16} />}
                    >
                      Retry Loading Messages
                    </Button>
                    <p className="text-sm text-gray-500">
                      If this continues to fail, there may be an issue with the database connection or RLS policies.
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">No messages found in this session</p>
                  <p className="text-sm mt-1 text-gray-400">
                    This session may not have any user or assistant messages, or there may be a loading issue.
                  </p>
                  <div className="mt-6 space-y-3">
                    <Button
                      variant="primary"
                      onClick={() => loadSessionMessages(selectedSession.id)}
                      leftIcon={<RefreshCw size={16} />}
                    >
                      Retry Loading Messages
                    </Button>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Debug Info:</p>
                      <p>Session ID: {selectedSession.id}</p>
                      <p>Expected Messages: {selectedSession.message_count}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.filter(msg => msg.role !== 'system').map((message, index) => (
                    <div key={message.id} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'user' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {message.role === 'user' ? (
                            <User size={16} />
                          ) : (
                            <MessageSquare size={16} />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {message.role === 'user' ? 'User' : 'ForwardOps AI'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(new Date(message.created_at))}
                          </span>
                        </div>
                        
                        <div className="prose prose-sm max-w-none">
                          <div className="text-gray-800 whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatLogViewer;
import React, { useRef, useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message } from '../../types';
import { Bot, MessageSquare, Download, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useChatStore, ASSISTANT_MODES } from '../../store/chatStore';
import Button from '../ui/Button';
import { cleanMarkdown, formatMessages, generateTranscriptTitle, generateFooter, formatForPDF } from '../../utils/exportUtils';

function ChatInterface() {
  const { 
    messages, 
    addMessage, 
    isLoading, 
    setLoading, 
    currentSessionId,
    createNewSession,
    clearMessages,
    currentMode,
    switchMode
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  
  const displayMessages = messages.filter(msg => msg.role !== 'system');
  const currentModeInfo = ASSISTANT_MODES[currentMode];

  // Suggestion to mode mapping
  const suggestionModeMap: Record<string, string> = {
    "File a VA claim": "claims_mode",
    "Read my VA Letter": "document_mode", 
    "Get Help with Mental Health": "mental_health_mode",
    "Learn About the GI Bill": "education_mode",
    "Get Job Help": "career_mode",
    "Understand my VA Pay": "finance_mode",
    "VA Home Loans": "housing_mode",
    "Support for Dependents or Survivors": "survivor_mode",
    "Transition to Civilian Life": "transition_mode",
    "Train me to Understand VA Claims": "training_mode"
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (format: 'pdf' | 'txt') => {
    if (displayMessages.length === 0) return;
    setShowDownloadMenu(false);

    if (format === 'txt') {
      const title = generateTranscriptTitle();
      const content = formatMessages(displayMessages);
      const footer = generateFooter();
      const fullContent = `${title}\n\n${content}\n\n${footer}`;
      
      const blob = new Blob([fullContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forward-assist-chat-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Enhanced PDF generation with better formatting
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // Page setup
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Helper function to add text with proper spacing
      const addTextWithSpacing = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal', extraSpacing: number = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.4; // Adjust line height based on font size
        
        lines.forEach((line: string, index: number) => {
          // Check if we need a new page
          if (yPosition + lineHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        
        // Add extra spacing after the text block
        yPosition += extraSpacing;
      };
      
      // Get formatted content
      const { title, content, footer } = formatForPDF(displayMessages);
      
      // Add title with extra spacing
      addTextWithSpacing(title, 16, 'bold', 15);
      
      // Add a separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Process content with enhanced formatting
      const contentLines = content.split('\n');
      let isMessageHeader = false;
      
      contentLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip empty lines but add spacing
        if (!trimmedLine) {
          yPosition += 4; // Small spacing for empty lines
          return;
        }
        
        // Check if this is a message header (contains "User -" or "ForwardOps AI -")
        if (trimmedLine.includes(' - ') && (trimmedLine.startsWith('User') || trimmedLine.startsWith('ForwardOps AI'))) {
          // Add extra space before new message (except first one)
          if (index > 0) {
            yPosition += 8;
          }
          
          // Add message header with bold formatting
          addTextWithSpacing(trimmedLine, 12, 'bold', 6);
          isMessageHeader = true;
        } else {
          // Regular content
          const fontSize = 11;
          const fontStyle = 'normal';
          
          // Check if this line starts with a bullet point
          if (trimmedLine.startsWith('•')) {
            addTextWithSpacing(trimmedLine, fontSize, fontStyle, 3);
          } else {
            addTextWithSpacing(trimmedLine, fontSize, fontStyle, 4);
          }
        }
      });
      
      // Add footer with separator
      yPosition += 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      addTextWithSpacing(footer, 10, 'italic', 0);
      
      // Save the PDF
      pdf.save(`forward-assist-chat-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  useEffect(() => {
    const handleDocumentAnalysis = async (event: CustomEvent) => {
      if (!event.detail?.content) {
        console.error('Document Analysis Error: No content provided');
        return;
      }

      console.log('Starting document analysis pipeline...');

      try {
        clearMessages();
        const sessionId = await createNewSession();
        console.log('Created new session:', sessionId);
        
        const systemMessage: Message = {
          id: 'system',
          role: 'system',
          content: `You are analyzing a document. Here is the content:

${event.detail.content}

When answering questions:
1. Reference specific parts of the document
2. Quote relevant sections when appropriate
3. Explain technical terms
4. Highlight important dates and deadlines
5. Identify required actions`,
          timestamp: new Date(),
        };
        
        await addMessage(systemMessage);
        console.log('Added system message with document content');

        if (event.detail.analysis) {
          const analysisMessage: Message = {
            id: `analysis-${Date.now()}`,
            role: 'assistant',
            content: event.detail.analysis,
            timestamp: new Date(),
          };
          await addMessage(analysisMessage);
        } else {
          console.log('Initiating document analysis...');
          await handleSendMessage(
            "Please analyze this document and provide a detailed summary including:\n" +
            "1. Key findings and important information\n" +
            "2. Critical dates and deadlines\n" +
            "3. Required actions or next steps\n" +
            "4. Relevant VA regulations or policies\n" +
            "5. Technical terms explained in plain language",
            true
          );
        }
        console.log('Analysis request sent successfully');
      } catch (error) {
        console.error('Document Analysis Pipeline Error:', error);
      }
    };

    window.addEventListener('startChatWithDocumentContent', handleDocumentAnalysis as EventListener);
    return () => {
      window.removeEventListener('startChatWithDocumentContent', handleDocumentAnalysis as EventListener);
    };
  }, [addMessage, clearMessages, createNewSession]);

  useEffect(() => {
    if (!currentSessionId) return;

    console.log('Subscribing to real-time updates for session:', currentSessionId);

    const subscription = supabase
      .channel(`messages:${currentSessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${currentSessionId}`,
      }, async (payload) => {
        console.log('Received new message:', payload.new);
        if (payload.new.role === 'assistant') {
          const newMessage: Message = {
            id: payload.new.id,
            role: payload.new.role,
            content: payload.new.content,
            timestamp: new Date(payload.new.created_at),
          };
          addMessage(newMessage);
        }
      })
      .subscribe();

    return () => {
      console.log('Unsubscribing from real-time updates');
      subscription.unsubscribe();
    };
  }, [currentSessionId, addMessage]);
  
  const handleSendMessage = async (content: string, silent = false) => {
    let sessionId = currentSessionId;
    
    if (!sessionId) {
      console.log('Creating new session...');
      sessionId = await createNewSession();
    }

    if (!silent) {
      console.log('Adding user message to chat');
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      await addMessage(userMessage);
    }
    
    setLoading(true);
    
    try {
      console.log('Processing message request...');
      const thinkingMessage: Message = {
        id: 'thinking',
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      useChatStore.setState(state => ({
        messages: [...state.messages, thinkingMessage]
      }));

      console.log('Sending request to chat function...');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId,
          messages: messages.filter(msg => msg.id !== 'thinking').map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      console.log('Removing thinking message');
      useChatStore.setState(state => ({
        messages: state.messages.filter(msg => msg.id !== 'thinking')
      }));

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      await addMessage(assistantMessage);
      setStreamingMessageId(assistantMessage.id);

      console.log('Processing streaming response...');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        accumulatedContent += chunk;

        useChatStore.setState(state => ({
          messages: state.messages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        }));
      }

      console.log('Message processing completed');
      setStreamingMessageId(null);

      if (accumulatedContent.trim()) {
        console.log('Saving message to Supabase...');
        await supabase.from('messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: accumulatedContent,
        });
        console.log('Message saved successfully');
      }

    } catch (error) {
      console.error('Error in message processing:', error);
      
      useChatStore.setState(state => ({
        messages: state.messages.filter(msg => msg.id !== 'thinking')
      }));
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      await addMessage(errorMessage);
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Check if this suggestion should trigger a mode switch
    const targetMode = suggestionModeMap[suggestion];
    if (targetMode && targetMode !== currentMode) {
      await switchMode(targetMode as any);
    }
    
    // Send the message
    await handleSendMessage(suggestion);
  };
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Simple header with export button only */}
      <div className="flex-none border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-end">
            {displayMessages.length > 0 && (
              <div className="relative" ref={downloadMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="text-gray-600 hover:bg-gray-100 gap-2"
                >
                  <Download size={16} />
                  Export
                  <ChevronDown size={16} className={`transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                </Button>
                
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => handleDownload('txt')}
                        className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Download size={16} />
                        Download as TXT
                      </button>
                      <button
                        onClick={() => handleDownload('pdf')}
                        className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Download size={16} />
                        Download as PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {/* Bot icon and title in a flex row */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0A2463] to-[#061A47] rounded-xl flex items-center justify-center shadow-lg">
                <Bot size={24} className="text-[#FFBA08]" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0A2463] to-[#061A47] bg-clip-text text-transparent">
                ForwardOps AI
              </h2>
            </div>
            
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              I'm your dedicated AI assistant for navigating VA claims, benefits, and transition support. How can I help you today?
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-4xl">
              {[
                "File a VA claim",
                "Read my VA Letter",
                "Get Help with Mental Health",
                "Learn About the GI Bill",
                "Get Job Help",
                "Understand my VA Pay",
                "VA Home Loans",
                "Support for Dependents or Survivors",
                "Transition to Civilian Life",
                "Train me to Understand VA Claims"
              ].map((suggestion, i) => (
                <button
                  key={i}
                  className="bg-white hover:bg-gray-50 text-left p-4 rounded-lg border border-gray-200 transition-colors duration-200 text-gray-800 hover:border-[#0A2463] hover:shadow-md"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {displayMessages.map((message: Message) => (
              message.id === 'thinking' ? (
                <div key="thinking" className="w-full bg-gray-50">
                  <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#0A2463] to-[#061A47] rounded-full flex items-center justify-center">
                          <Bot size={18} className="text-[#FFBA08]" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">ForwardOps AI</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <ChatMessage 
                  key={message.id} 
                  message={message}
                  isLatest={message.id === displayMessages[displayMessages.length - 1].id}
                  isStreaming={message.id === streamingMessageId}
                />
              )
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input */}
      <div className="flex-none border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Message ForwardOps AI..."
          />
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
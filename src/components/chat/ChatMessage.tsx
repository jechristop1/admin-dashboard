import React from 'react';
import { Message } from '../../types';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
  isStreaming?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLatest = false, isStreaming = false }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  if (isSystem) return null; // Don't display system messages
  
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };
  
  return (
    <div className={`group w-full ${isUser ? 'bg-transparent' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser 
                ? 'bg-[#0A2463] text-white' 
                : 'bg-gradient-to-br from-[#0A2463] to-[#061A47] text-[#FFBA08]'
            }`}>
              {isUser ? (
                <User size={18} />
              ) : (
                <Bot size={18} />
              )}
            </div>
          </div>
          
          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {/* Header with name and timestamp */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">
                {isUser ? 'You' : 'ForwardOps AI'}
              </span>
              <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            
            {/* Message text */}
            <div className="prose prose-gray max-w-none">
              <div className="text-gray-800 leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 pl-6 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 pl-6 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-800">{children}</li>,
                    h1: ({ children }) => <h1 className="text-xl font-semibold mb-3 text-gray-900">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-900">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-gray-900">{children}</h3>,
                    code: ({ children, className }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="block bg-gray-100 text-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-3">
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-800">{children}</em>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-5 bg-gray-400 animate-pulse ml-1" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
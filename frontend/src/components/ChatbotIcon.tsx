'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaComments, FaTimes } from 'react-icons/fa';
import { API_URL, fetchWithRetry } from '../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatbotIcon: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedConversationId = localStorage.getItem('chatbot-conversation-id');
    if (savedConversationId) {
      setConversationId(savedConversationId);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const token = localStorage.getItem('token');
    if (!token || token === 'undefined') {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Please login to use the chatbot.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    const messageText = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let userId = localStorage.getItem('user_id');
      if (!userId) {
        const storedUser = localStorage.getItem('user');
        if (storedUser && storedUser !== 'undefined') {
          try {
            const userObj = JSON.parse(storedUser);
            if (userObj && typeof userObj.id !== 'undefined') {
              userId = String(userObj.id);
            }
          } catch (parseError) {
            console.error('Error parsing stored user:', parseError);
          }
        }
      }

      if (!userId) {
        throw new Error('User ID not found. Please login again.');
      }

      const response = await fetchWithRetry(`${API_URL}/api/${userId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversation_id: conversationId || undefined,
          message: messageText
        })
      });

      if (!response.ok) {
        if (response.status === 404 && conversationId) {
          // Stale conversation ID (DB may have been reset) — clear and retry
          setConversationId(null);
          localStorage.removeItem('chatbot-conversation-id');
          const retryResponse = await fetchWithRetry(`${API_URL}/api/${userId}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: messageText })
          });
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          const retryData = await retryResponse.json();
          if (retryData.conversation_id) {
            setConversationId(retryData.conversation_id);
            localStorage.setItem('chatbot-conversation-id', retryData.conversation_id);
          }
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: retryData.response,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          return;
        } else if (response.status === 403) {
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Authentication failed, relogin.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          throw new Error('Access forbidden. Please check your authentication.');
        } else if (response.status === 401) {
          throw new Error('Unauthorized. Please login again.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
        localStorage.setItem('chatbot-conversation-id', data.conversation_id);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      if (!(error instanceof Error) || !error.message.includes('Access forbidden')) {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #a855f7)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(108, 99, 255, 0.4)',
          }}
          aria-label="Open chat assistant"
        >
          <FaComments size={22} />
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #a855f7)',
              animation: 'pulse-soft 2s ease-in-out infinite',
              opacity: 0.3,
              zIndex: -1,
            }}
          />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={toggleChat}
            aria-hidden="true"
          />

          <div
            className="fixed z-50 flex flex-col
              bottom-0 right-0 w-full h-[85vh]
              sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[560px] sm:rounded-2xl"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              boxShadow: 'var(--shadow-xl)',
              animation: 'fadeInUp 0.3s ease-out',
            }}
            role="dialog"
            aria-label="Chat assistant"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0 sm:rounded-t-2xl"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), #a855f7)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    TaskFlow AI
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--success)' }}>
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={toggleChat}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{
                  color: 'var(--text-tertiary)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                aria-label="Close chat"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ background: 'var(--bg-primary)' }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--accent-primary-light)' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      TaskFlow AI Assistant
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Ask me to add, list, complete, delete, or update your tasks
                    </p>
                  </div>
                  {/* Quick action chips */}
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['List my tasks', 'Add a new task', 'What can you do?'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInputValue(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-primary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.color = 'var(--accent-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-primary)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm"
                        style={message.role === 'user' ? {
                          background: 'var(--accent-primary)',
                          color: 'white',
                          borderBottomRightRadius: '4px',
                        } : {
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-primary)',
                          borderBottomLeftRadius: '4px',
                        }}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p
                          className="text-[10px] mt-1.5"
                          style={{ opacity: 0.5 }}
                        >
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div
                        className="px-4 py-3 rounded-2xl"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-primary)',
                          borderBottomLeftRadius: '4px',
                        }}
                      >
                        <div className="typing-indicator">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div
              className="flex-shrink-0 px-4 py-3 border-t"
              style={{
                borderColor: 'var(--border-primary)',
                background: 'var(--bg-secondary)',
              }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm resize-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    maxHeight: '100px',
                    minHeight: '42px',
                  }}
                  disabled={isLoading}
                  rows={1}
                  aria-label="Chat message input"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    background: (isLoading || !inputValue.trim()) ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                    color: (isLoading || !inputValue.trim()) ? 'var(--text-tertiary)' : 'white',
                    cursor: (isLoading || !inputValue.trim()) ? 'not-allowed' : 'pointer',
                  }}
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
              <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-tertiary)' }}>
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ChatbotIcon;

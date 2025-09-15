'use client';

import React, { useState } from 'react';
import AiChatInput from '@/components/ui/ai-chat-input';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  images?: string[];
  metadata?: {
    setupType: 'premium' | 'casual';
    currency: string;
    minBudget: number;
    maxBudget: number;
  };
  timestamp: Date;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: {
    message: string;
    images: File[];
    setupType: 'premium' | 'casual';
    currency: string;
    minBudget: number;
    maxBudget: number;
  }) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: data.message,
      images: data.images.map(img => URL.createObjectURL(img)),
      metadata: {
        setupType: data.setupType,
        currency: data.currency,
        minBudget: data.minBudget,
        maxBudget: data.maxBudget
      },
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('message', data.message);
      formData.append('setupType', data.setupType);
      formData.append('currency', data.currency);
      formData.append('minBudget', data.minBudget.toString());
      formData.append('maxBudget', data.maxBudget.toString());
      
      data.images.forEach((image, index) => {
        formData.append(`image_${index}`, image);
      });

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const result = await response.json();

      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: result.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Setup Assistant
            </h1>
            <p className="text-gray-600">
              Describe your setup needs, upload reference images, and get personalized recommendations
            </p>
          </div>

          {/* Chat Messages */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 min-h-[400px]">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-lg">Start a conversation with the AI assistant</p>
                  <p className="text-sm mt-2">Upload images, set your budget, and describe what you need</p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.type === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      
                      {/* Images */}
                      {message.images && message.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.images.map((img, index) => (
                            <img
                              key={index}
                              src={img}
                              alt={`Reference ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Metadata */}
                      {message.metadata && (
                        <div className="text-xs opacity-75 mt-2">
                          {message.metadata.setupType} • {message.metadata.currency} {message.metadata.minBudget}-{message.metadata.maxBudget}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className="text-xs opacity-75 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl p-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span className="text-gray-600">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <AiChatInput
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="Describe your setup requirements..."
          />
        </div>
      </div>
    </div>
  );
}
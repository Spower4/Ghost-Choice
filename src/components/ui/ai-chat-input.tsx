'use client';

import React, { useState, useRef } from 'react';
import { Upload, Mic, ArrowUp, ChevronDown } from 'lucide-react';
import { useSpeechToText } from '@/hooks/use-speech-to-text';

interface AiChatInputProps {
  onSubmit: (data: {
    message: string;
    images: File[];
    setupType: 'premium' | 'casual';
    currency: string;
    minBudget: number;
    maxBudget: number;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function AiChatInput({ 
  onSubmit, 
  placeholder = "Describe your setup requirements...",
  disabled = false 
}: AiChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [setupType, setSetupType] = useState<'premium' | 'casual'>('casual');
  const [currency, setCurrency] = useState('USD');
  const [minBudget, setMinBudget] = useState<number>(100);
  const [maxBudget, setMaxBudget] = useState<number>(1000);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currencies = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD'];

  const { isListening, startListening, stopListening } = useSpeechToText({
    onResult: (transcript) => {
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
    }
  });
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && images.length === 0) return;
    
    onSubmit({
      message: message.trim(),
      images,
      setupType,
      currency,
      minBudget,
      maxBudget
    });
    
    // Reset form
    setMessage('');
    setImages([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Image Preview */}
      {images.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={URL.createObjectURL(image)}
                alt={`Upload ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        {/* Main Input Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          {/* Text Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full resize-none border-none outline-none text-gray-700 placeholder-gray-400 text-base leading-relaxed min-h-[60px] max-h-[200px]"
            rows={3}
          />
          
          {/* Controls Row */}
          <div className="flex items-center justify-between mt-4 gap-3">
            {/* Left Side Controls */}
            <div className="flex items-center gap-3">
              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                title="Upload reference images"
              >
                <Upload className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* Setup Type Dropdown */}
              <div className="relative">
                <select
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value as 'premium' | 'casual')}
                  className="appearance-none bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-gray-700 cursor-pointer transition-colors"
                >
                  <option value="casual">Casual</option>
                  <option value="premium">Premium</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              
              {/* Currency Dropdown */}
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="appearance-none bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 pr-7 text-sm font-medium text-gray-700 cursor-pointer transition-colors"
                >
                  {currencies.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Center - Budget Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(Number(e.target.value))}
                placeholder="Min"
                className="w-20 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-center border-none outline-none"
              />
              <span className="text-gray-400 text-sm">-</span>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                placeholder="Max"
                className="w-20 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-center border-none outline-none"
              />
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3">
              {/* Mic Button */}
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                  isListening 
                    ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
              </button>
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={disabled || (!message.trim() && images.length === 0)}
                className="flex items-center justify-center w-10 h-10 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 rounded-xl transition-colors"
                title="Send message"
              >
                <ArrowUp className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}
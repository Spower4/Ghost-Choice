'use client'

import { useState, useRef, useEffect } from 'react'
import { SearchSettings } from '@/types'
import { Upload, Mic, ArrowUp } from 'lucide-react'
import { useSpeechToText } from '@/hooks/use-speech-to-text'
import { Select } from './select'

interface SearchInputProps {
  onSearch: (query: string, settings: SearchSettings) => void
  settings: SearchSettings
  onSettingsChange?: (settings: SearchSettings) => void
  placeholder?: string
  className?: string
  suggestions?: string[]
  isLoading?: boolean
  onImageUpload?: (images: File[]) => void
}

const SEARCH_SUGGESTIONS = [
  'gaming setup',
  'home office',
  'bedroom decor',
  'kitchen essentials',
  'workout equipment',
  'study desk',
  'living room',
  'bathroom accessories',
  'outdoor furniture',
  'art supplies',
  'music studio',
  'reading nook'
]

export function SearchInput({ 
  onSearch, 
  settings, 
  onSettingsChange,
  placeholder = "Describe your setup requirements...",
  className = '',
  suggestions = SEARCH_SUGGESTIONS,
  isLoading = false,
  onImageUpload
}: SearchInputProps) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [images, setImages] = useState<File[]>([])
  const [setupType, setSetupType] = useState<'premium' | 'casual'>(settings.style === 'Premium' ? 'premium' : 'casual')
  const [currency, setCurrency] = useState<'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD'>(settings.currency as 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD')
  const [minBudget, setMinBudget] = useState<number>(settings.minBudget || 100)
  const [maxBudget, setMaxBudget] = useState<number>(settings.budget || 1000)
  
  const currencies: Array<'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD'> = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD']
  
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const [isMounted, setIsMounted] = useState(false)
  
  const { isListening, startListening, stopListening, isSupported, resetTranscript } = useSpeechToText({
    onResult: (transcript) => {
      setQuery(transcript)
    },
    onError: (error) => {
      console.error('Speech recognition error:', error)
    },
    continuous: true
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Update local state when parent settings change
  useEffect(() => {
    setSetupType(settings.style === 'Premium' ? 'premium' : 'casual')
    setCurrency(settings.currency as 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD')
    setMinBudget(settings.minBudget || 100)
    setMaxBudget(settings.budget || 1000)
  }, [settings])

  // Helper function to update both local state and parent settings
  const updateSettings = (updates: Partial<SearchSettings>) => {
    const newSettings = { ...settings, ...updates }
    onSettingsChange?.(newSettings)
  }

  const handleSetupTypeChange = (value: 'premium' | 'casual') => {
    setSetupType(value)
    updateSettings({ 
      style: value === 'premium' ? 'Premium' : 'Casual',
      setupType: value 
    })
  }

  const handleCurrencyChange = (value: 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD') => {
    setCurrency(value)
    updateSettings({ currency: value })
  }

  const handleMinBudgetChange = (value: number) => {
    setMinBudget(value)
    updateSettings({ minBudget: value })
  }

  const handleMaxBudgetChange = (value: number) => {
    setMaxBudget(value)
    updateSettings({ budget: value, maxBudget: value })
  }

  useEffect(() => {
    if (query.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
    setSelectedIndex(-1)
  }, [query, suggestions])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages(prev => [...prev, ...files])
    onImageUpload?.(files)
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleVoiceToggle = () => {
    if (!isMounted || !isSupported) {
      alert('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.')
      return
    }
    
    if (isListening) {
      stopListening()
    } else {
      resetTranscript() // Clear previous transcript
      startListening()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !isLoading) {
      // Update settings with new values
      const updatedSettings = {
        ...settings,
        setupType,
        currency,
        minBudget,
        maxBudget
      }
      onSearch(query.trim(), updatedSettings)
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault()
          const selectedSuggestion = filteredSuggestions[selectedIndex]
          setQuery(selectedSuggestion)
          onSearch(selectedSuggestion, settings)
          setShowSuggestions(false)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    onSearch(suggestion, settings)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* Image Preview Section */}
      {images.length > 0 && (
        <div className="mb-6 p-4 bg-muted rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Reference Images</span>
            <span className="text-xs text-muted-foreground">({images.length})</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Reference ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-2xl border-2 border-card shadow-sm group-hover:shadow-md transition-shadow"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shadow-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        {/* Single Unified Search Container */}
        <div className="bg-card rounded-[2rem] border-2 border-border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Text Input Section */}
          <div className="p-6 pb-4">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (filteredSuggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200)
              }}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full text-lg font-medium text-card-foreground placeholder-muted-foreground border-none outline-none bg-transparent leading-relaxed"
            />
            
            {/* Voice Input Indicator */}
            {isListening && (
              <div className="flex items-center gap-2 mt-2 text-destructive">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Listening...</span>
              </div>
            )}
          </div>
          
          {/* Controls Section */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between gap-4">
              {/* Left Controls Group */}
              <div className="flex items-center gap-3">
                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-11 h-11 bg-muted hover:bg-accent border border-border hover:border-primary/50 rounded-2xl transition-all duration-200"
                  title="Upload reference images"
                >
                  <Upload className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                </button>
                
                {/* Setup Type Dropdown - Desktop/Laptop only */}
                <div className="min-w-[100px] hidden lg:block">
                  <Select
                    value={setupType}
                    onChange={(value) => handleSetupTypeChange(value as 'premium' | 'casual')}
                    options={[
                      { value: 'casual', label: 'Casual' },
                      { value: 'premium', label: 'Premium' }
                    ]}
                    compact={true}
                    className="text-sm"
                  />
                </div>
                
                {/* Currency Dropdown - Desktop/Laptop only */}
                <div className="min-w-[80px] hidden lg:block">
                  <Select
                    value={currency}
                    onChange={(value) => handleCurrencyChange(value as 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD')}
                    options={currencies.map(curr => ({ value: curr, label: curr }))}
                    compact={true}
                    className="text-sm"
                  />
                </div>
                

              </div>

              {/* Center - Budget Inputs - Desktop/Laptop only */}
              <div className="hidden lg:flex items-center gap-2">
                <input
                  type="number"
                  value={minBudget}
                  onChange={(e) => handleMinBudgetChange(Number(e.target.value))}
                  placeholder="Min"
                  className="w-24 px-4 py-3 bg-muted hover:bg-accent border border-border hover:border-primary/50 rounded-2xl text-base font-medium text-center text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-muted-foreground font-medium text-lg">–</span>
                <input
                  type="number"
                  value={maxBudget}
                  onChange={(e) => handleMaxBudgetChange(Number(e.target.value))}
                  placeholder="Max"
                  className="w-24 px-4 py-3 bg-muted hover:bg-accent border border-border hover:border-primary/50 rounded-2xl text-base font-medium text-center text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Right Controls Group */}
              <div className="flex items-center gap-3">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={!isMounted || !isSupported}
                  className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-all duration-200 ${
                    !isMounted || !isSupported
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed'
                      : isListening 
                      ? 'bg-destructive/10 border-destructive/50 text-destructive shadow-md' 
                      : 'bg-muted hover:bg-accent border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                  }`}
                  title={
                    !isMounted || !isSupported 
                      ? "Speech recognition not supported" 
                      : isListening 
                      ? "Stop listening" 
                      : "Start voice input"
                  }
                >
                  <Mic className={`w-5 h-5 transition-all duration-200 ${isMounted && isListening ? 'animate-pulse' : ''}`} />
                </button>
                
                {/* Search Button */}
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="flex items-center justify-center w-12 h-12 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-2xl shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200"
                  title="Search"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </button>
              </div>
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

      {/* Enhanced Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-popover border-2 border-border rounded-3xl shadow-xl z-50 max-h-80 overflow-hidden">
          <div className="p-3 border-b border-border bg-muted">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Suggestions</span>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full px-5 py-4 text-left transition-all duration-150 group ${
                  index === selectedIndex 
                    ? 'bg-accent text-primary border-r-4 border-primary' 
                    : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className={`w-4 h-4 transition-colors ${
                      index === selectedIndex ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="font-medium">{suggestion}</span>
                  </div>
                  <svg className={`w-4 h-4 transition-all duration-200 ${
                    index === selectedIndex ? 'text-primary translate-x-0' : 'text-muted-foreground -translate-x-2 group-hover:translate-x-0 group-hover:text-foreground'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'

interface SaveButtonProps {
  searchId: string
  isAuthenticated?: boolean
}

export function SaveButton({ searchId, isAuthenticated = false }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if search is already saved
  useEffect(() => {
    checkSaveStatus()
  }, [searchId])

  const checkSaveStatus = async () => {
    try {
      const response = await fetch('/api/save-search')
      if (response.ok) {
        const data = await response.json()
        setIsSaved(data.data.includes(searchId))
      }
    } catch (error) {
      console.error('Error checking save status:', error)
    }
  }

  const handleSave = async () => {
    if (!isAuthenticated) return
    
    setIsLoading(true)
    try {
      if (isSaved) {
        // Unsave
        const response = await fetch(`/api/save-search?id=${searchId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setIsSaved(false)
        } else {
          console.error('Failed to unsave search')
        }
      } else {
        // Save
        const response = await fetch('/api/save-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchId })
        })
        
        if (response.ok) {
          setIsSaved(true)
        } else {
          console.error('Failed to save search')
        }
      }
    } catch (error) {
      console.error('Error saving/unsaving search:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <button
      onClick={handleSave}
      disabled={isLoading}
      className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 text-sm ${
        isSaved
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-card text-card-foreground border border-border hover:bg-accent'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isSaved ? 'Remove from saved lists' : 'Save this search'}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
          <span>Saving...</span>
        </>
      ) : (
        <>
          <svg 
            className="w-3 h-3" 
            fill={isSaved ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
            />
          </svg>
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </>
      )}
    </button>
  )
}
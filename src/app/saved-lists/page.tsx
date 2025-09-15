'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/ui/navbar'
import { useAuth } from '@/hooks/use-auth'
import { SearchSettings } from '@/types'
import SpotlightCard from '@/components/ui/spotlight-card'

const DEFAULT_SETTINGS: SearchSettings = {
  style: 'Premium',
  budget: 1000,
  currency: 'USD',
  amazonOnly: false
}

interface SavedSearch {
  id: string
  query: string
  settings: SearchSettings
  createdAt: Date
  productCount: number
}

export default function SavedListsPage() {
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
      return
    }

    if (isAuthenticated) {
      // Load real saved searches from cache
      loadSavedSearches()
    }
  }, [isAuthenticated, authLoading, router])

  const loadSavedSearches = async () => {
    try {
      const response = await fetch('/api/saved-searches')
      if (response.ok) {
        const data = await response.json()
        setSavedSearches(data.data || [])
      } else {
        console.error('Failed to load saved searches')
        setSavedSearches([])
      }
    } catch (error) {
      console.error('Error loading saved searches:', error)
      setSavedSearches([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewResults = (searchId: string) => {
    // Navigate to cached results instead of performing new search
    router.push(`/cached-results/${searchId}`)
  }

  const handleSearch = (query: string, searchSettings: SearchSettings) => {
    const params = new URLSearchParams({
      q: query,
      style: searchSettings.style,
      budget: searchSettings.budget.toString(),
      currency: searchSettings.currency,
      amazonOnly: searchSettings.amazonOnly.toString()
    })

    router.push(`/results?${params.toString()}`)
  }

  const handleDeleteSearch = async (searchId: string) => {
    try {
      const response = await fetch(`/api/saved-searches?id=${searchId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setSavedSearches(prev => prev.filter(search => search.id !== searchId))
      } else {
        console.error('Failed to delete search')
      }
    } catch (error) {
      console.error('Error deleting search:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card">
      {/* Navigation */}
      <Navbar
        settings={settings}
        onSettingsChange={setSettings}
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Saved Lists</h1>
          <p className="text-muted-foreground">
            Your saved searches and product lists
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your saved lists...</p>
          </div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No saved lists yet</h3>
            <p className="text-muted-foreground mb-6">
              Start searching and save your favorite product lists to see them here.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors font-medium"
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {savedSearches.map((search) => (
              <SpotlightCard
                key={search.id}
                spotlightColor="rgba(139, 92, 246, 0.15)"
                className="bg-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-card-foreground mb-2">
                        "{search.query}"
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{search.productCount} products</span>
                        <span>•</span>
                        <span>{search.settings.style} style</span>
                        <span>•</span>
                        <span>${search.settings.budget} budget</span>
                        <span>•</span>
                        <span>{formatDate(search.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSearch(search.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        search.settings.amazonOnly 
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {search.settings.amazonOnly ? 'Amazon Only' : 'All Stores'}
                      </span>
                      <span className="px-2 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                        {search.settings.currency}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleViewResults(search.id)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors font-medium text-sm"
                    >
                      View Results
                    </button>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
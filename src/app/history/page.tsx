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

interface HistorySearch {
  id: string
  query: string
  settings: SearchSettings
  createdAt: Date
  productCount: number
  isSaved: boolean
}

export default function HistoryPage() {
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS)
  const [historySearches, setHistorySearches] = useState<HistorySearch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
      return
    }

    if (isAuthenticated) {
      loadSearchHistory()
    }
  }, [isAuthenticated, authLoading, router])

  const loadSearchHistory = async () => {
    try {
      const response = await fetch('/api/search-history')
      if (response.ok) {
        const data = await response.json()
        setHistorySearches(data.data || [])
      } else {
        console.error('Failed to load search history')
        setHistorySearches([])
      }
    } catch (error) {
      console.error('Error loading search history:', error)
      setHistorySearches([])
    } finally {
      setIsLoading(false)
    }
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

  const handleViewResults = (searchId: string) => {
    router.push(`/cached-results/${searchId}`)
  }

  const handleSaveSearch = async (searchId: string) => {
    try {
      const response = await fetch('/api/save-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId })
      })
      
      if (response.ok) {
        // Update the local state to mark as saved
        setHistorySearches(prev => 
          prev.map(search => 
            search.id === searchId 
              ? { ...search, isSaved: true }
              : search
          )
        )
      } else {
        console.error('Failed to save search')
      }
    } catch (error) {
      console.error('Error saving search:', error)
    }
  }

  const handleUnsaveSearch = async (searchId: string) => {
    try {
      const response = await fetch(`/api/saved-searches?id=${searchId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Update the local state to mark as unsaved
        setHistorySearches(prev => 
          prev.map(search => 
            search.id === searchId 
              ? { ...search, isSaved: false }
              : search
          )
        )
      } else {
        console.error('Failed to unsave search')
      }
    } catch (error) {
      console.error('Error unsaving search:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Search History</h1>
          <p className="text-muted-foreground">
            All your search history with save/unsave options
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your search history...</p>
          </div>
        ) : historySearches.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No search history yet</h3>
            <p className="text-muted-foreground mb-6">
              Start searching to see your search history here.
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
            {historySearches.map((search) => (
              <SpotlightCard
                key={search.id}
                spotlightColor="rgba(139, 92, 246, 0.15)"
                className="bg-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-card-foreground">
                          "{search.query}"
                        </h3>
                        {search.isSaved && (
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            Saved
                          </span>
                        )}
                      </div>
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
                    <div className="flex items-center gap-2">
                      {/* Save/Unsave Button */}
                      <button
                        onClick={() => search.isSaved ? handleUnsaveSearch(search.id) : handleSaveSearch(search.id)}
                        className={`p-2 rounded-full transition-colors ${
                          search.isSaved
                            ? 'text-primary hover:text-primary/80 hover:bg-primary/10'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                        }`}
                        title={search.isSaved ? 'Remove from saved' : 'Save this search'}
                      >
                        <svg className="w-5 h-5" fill={search.isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
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
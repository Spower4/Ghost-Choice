'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/ui/navbar'
import { ProductCard } from '@/components/product/product-card'
import { ExportButtons } from '@/components/ui/export-buttons'
import { SearchSettings } from '@/types'
import { Product } from '@/types'

const DEFAULT_SETTINGS: SearchSettings = {
  style: 'Premium',
  budget: 1000,
  currency: 'USD',
  amazonOnly: false
}

interface CachedResultsData {
  query: string
  settings: SearchSettings
  results: Product[]
  productCount: number
  createdAt: string
}

export default function CachedResultsPage() {
  const params = useParams()
  const router = useRouter()
  const searchId = params.searchId as string
  
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS)
  const [resultsData, setResultsData] = useState<CachedResultsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchId) {
      loadCachedResults()
    }
  }, [searchId])

  const loadCachedResults = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/cached-results/${searchId}`)
      
      if (response.ok) {
        const data = await response.json()
        setResultsData(data.data)
        setSettings(data.data.settings)
        setError(null)
      } else if (response.status === 404) {
        setError('Cached results not found or expired')
      } else {
        setError('Failed to load cached results')
      }
    } catch (error) {
      console.error('Error loading cached results:', error)
      setError('Error loading cached results')
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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const calculateTotalCost = (products: Product[]) => {
    return products.reduce((sum, product) => sum + product.price, 0)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-card">
        <Navbar
          settings={settings}
          onSettingsChange={setSettings}
          onSearch={handleSearch}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading cached results...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !resultsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-card">
        <Navbar
          settings={settings}
          onSettingsChange={setSettings}
          onSearch={handleSearch}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Results Not Found</h3>
            <p className="text-muted-foreground mb-6">
              {error || 'The cached results you\'re looking for don\'t exist or have expired.'}
            </p>
            <button
              onClick={() => router.push('/saved-lists')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors font-medium"
            >
              Back to Saved Lists
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalCost = calculateTotalCost(resultsData.results)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card">
      {/* Navigation */}
      <Navbar
        settings={settings}
        onSettingsChange={setSettings}
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                "{resultsData.query}"
              </h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{resultsData.productCount} products</span>
                <span>•</span>
                <span>{resultsData.settings.style} style</span>
                <span>•</span>
                <span>${resultsData.settings.budget} budget</span>
                <span>•</span>
                <span>Saved {formatDate(resultsData.createdAt)}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/saved-lists')}
              className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-2xl hover:bg-accent transition-colors"
            >
              ← Back to Lists
            </button>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-card-foreground mb-2">Total Cost</h3>
                <p className="text-2xl font-bold text-primary">
                  ${totalCost.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {((totalCost / resultsData.settings.budget) * 100).toFixed(1)}% of budget
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground mb-2">Products Found</h3>
                <p className="text-2xl font-bold text-primary">{resultsData.productCount}</p>
                <p className="text-sm text-muted-foreground">Items in this setup</p>
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground mb-2">Style</h3>
                <p className="text-2xl font-bold text-primary">{resultsData.settings.style}</p>
                <p className="text-sm text-muted-foreground">
                  {resultsData.settings.amazonOnly ? 'Amazon Only' : 'All Stores'}
                </p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <ExportButtons 
            products={resultsData.results}
            query={resultsData.query}
            settings={resultsData.settings}
          />
        </div>

        {/* Products Grid */}
        {resultsData.results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {resultsData.results.map((product, index) => (
              <ProductCard
                key={`${product.link}-${index}`}
                product={product}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Products Found</h3>
            <p className="text-muted-foreground">
              This search didn't return any products within the specified criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { SearchSettings, Product, BudgetDistribution } from '@/types'
import { Navbar } from '@/components/ui/navbar'
import { ProductCard } from '@/components/product/product-card'
import { BudgetChart } from '@/components/charts/budget-chart'
import { StatsView } from '@/components/ui/stats-view'
import { ExportButtons } from '@/components/ui/export-buttons'
import { EnhancedGhostLoader } from '@/components/ghost/enhanced-ghost-loader'
import Noise from '@/components/ui/noise'
import { SwapModal } from '@/components/product/swap-modal'

import { SaveButton } from '@/components/ui/save-button'
import { useSwap, useSwapHistory } from '@/hooks/use-swap'

import { useAuth } from '@/hooks/use-auth'

interface BuildResponse {
  products: Product[]
  budgetChart?: BudgetDistribution[]
  ghostTips: string[]
  searchMetadata: {
    query: string
    totalResults: number
    searchTime: number
  }
  isSetup: boolean
  searchId?: string
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showStats, setShowStats] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [swapProduct, setSwapProduct] = useState<Product | null>(null)
  const [swapAlternatives, setSwapAlternatives] = useState<Product[]>([])
  const [swappingProductId, setSwappingProductId] = useState<string | null>(null)
  const [isRerolling, setIsRerolling] = useState(false)

  const { isAuthenticated } = useAuth()

  const [settings, setSettings] = useState<SearchSettings>({
    style: (searchParams.get('style') as 'Premium' | 'Casual') || 'Premium',
    budget: Number(searchParams.get('budget')) || 1000,
    currency: (searchParams.get('currency') as SearchSettings['currency']) || 'USD',
    amazonOnly: searchParams.get('amazonOnly') === 'true',
    region: searchParams.get('region') || 'US'
  })

  const { getSwapHistory, addToSwapHistory } = useSwapHistory()

  const query = searchParams.get('q') || ''

  // Fetch search results
  const { data, isLoading, error, refetch } = useQuery<BuildResponse>({
    queryKey: ['search', query, settings, isRerolling ? Date.now() : 'stable'], // Use timestamp to force new query when rerolling
    queryFn: async () => {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          settings,
          reroll: isRerolling // Add reroll flag to get fresh results
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }

      return response.json()
    },
    enabled: !!query,
    staleTime: 0, // Always fetch fresh data
    cacheTime: isRerolling ? 0 : 1000 * 60 * 5, // No cache when rerolling
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Update products when data changes
  useEffect(() => {
    if (data?.products) {
      setProducts(data.products)
    }
  }, [data])

  // Swap functionality
  const { swap, isSwapping } = useSwap({
    onSuccess: (alternatives) => {
      setSwapAlternatives(alternatives)
      setSwapModalOpen(true)
      setSwappingProductId(null)
    },
    onError: (error) => {
      console.error('Swap failed:', error)
      setSwappingProductId(null)
      // TODO: Show error toast
    }
  })

  // Handle settings changes
  const handleSettingsChange = (newSettings: SearchSettings) => {
    console.log('Results page - handleSettingsChange called with:', newSettings)
    console.log('Current settings:', settings)
    setSettings(newSettings)

    // Update URL parameters
    const params = new URLSearchParams({
      q: query,
      style: newSettings.style,
      budget: newSettings.budget.toString(),
      currency: newSettings.currency,
      region: newSettings.region || 'US',
      amazonOnly: newSettings.amazonOnly.toString()
    })

    console.log('Updating URL to:', `/results?${params.toString()}`)
    router.replace(`/results?${params.toString()}`)
  }

  // Handle product swap
  const handleSwap = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    setSwapProduct(product)
    setSwappingProductId(productId)

    // Get swap history to exclude previously shown alternatives
    const swapHistory = getSwapHistory(productId)
    const excludeIds = [productId, ...swapHistory]

    swap({
      productId,
      category: product.category,
      productTitle: product.title,
      budget: settings.budget,
      settings: {
        style: settings.style,
        region: settings.region || 'US',
        amazonOnly: settings.amazonOnly,
        currency: settings.currency
      },
      excludeIds
    })
  }

  // Handle alternative selection
  const handleSelectAlternative = (alternative: Product) => {
    if (!swapProduct) return

    // Add the selected alternative to swap history
    addToSwapHistory(swapProduct.id, alternative.id)

    // Replace the product in the products array
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === swapProduct.id ? alternative : p
      )
    )

    // Close modal and reset state
    setSwapModalOpen(false)
    setSwapProduct(null)
    setSwapAlternatives([])
  }

  // Handle reroll - Direct execution without dialog
  const handleReroll = async () => {
    if (!query || isLoading || isRerolling) return

    setIsRerolling(true)
    
    try {
      // Force a fresh fetch by invalidating the query and refetching
      const result = await refetch()
      
      // Update products with new results
      if (result.data?.products) {
        setProducts(result.data.products)
      }
    } catch (error) {
      console.error('Reroll failed:', error)
      // TODO: Show error toast to user
    } finally {
      // Reset rerolling state after a short delay to allow for UI feedback
      setTimeout(() => {
        setIsRerolling(false)
      }, 1000)
    }
  }

  // Handle new search
  const handleNewSearch = (newQuery: string, newSettings: SearchSettings) => {
    const params = new URLSearchParams({
      q: newQuery,
      style: newSettings.style,
      budget: newSettings.budget.toString(),
      currency: newSettings.currency,
      region: newSettings.region || 'US',
      amazonOnly: newSettings.amazonOnly.toString()
    })

    router.push(`/results?${params.toString()}`)
  }

  if (!query) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card">
      {/* Navigation */}
      <Navbar
        settings={settings}
        onSettingsChange={handleSettingsChange}
        isSearching={isLoading || isRerolling}
        onSearch={handleNewSearch}
      />

      {/* Background Pattern - Noise effect */}
      <Noise
        patternSize={250}
        patternScaleX={1}
        patternScaleY={1}
        patternRefreshInterval={2}
        patternAlpha={15}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header - Only show when data is loaded and not showing stats */}
        {data && !isLoading && !isRerolling && !showStats && (
          <div className="mb-4 sm:mb-8">
            {/* Title Section */}
            <div className="mb-3 sm:mb-4">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                Results for "{query}"
              </h1>
              {data && (
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  {data.searchMetadata.totalResults} products found in {(data.searchMetadata.searchTime / 1000).toFixed(1)}s
                </p>
              )}
            </div>

            {/* Action Buttons - Responsive Layout with Reroll on Right */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              {/* Left Side - Primary Actions */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {/* Stats Toggle */}
                {data && data.products.length > 0 && (
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm flex-shrink-0 ${showStats
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-card-foreground border border-border hover:bg-accent'
                      }`}
                  >
                    {showStats ? 'Show Products' : 'Show Stats'}
                  </button>
                )}

                {/* Export Button */}
                {data && data.products.length > 0 && (
                  <div className="flex-shrink-0">
                    <ExportButtons
                      products={data.products}
                      query={query}
                      settings={settings}
                      totalCost={data.products.reduce((sum, p) => sum + p.price, 0)}
                    />
                  </div>
                )}

                {/* Save Button - Only for authenticated users */}
                {data && data.searchId && isAuthenticated && (
                  <div className="flex-shrink-0">
                    <SaveButton searchId={data.searchId} isAuthenticated={isAuthenticated} />
                  </div>
                )}
              </div>

              {/* Right Side - Reroll Button */}
              <div className="flex justify-end">
                {/* Reroll Button for Setups */}
                {data && data.isSetup && (
                  <button
                    onClick={handleReroll}
                    disabled={isLoading || isRerolling}
                    className="px-3 py-2 bg-ghost-purple text-white rounded-lg hover:bg-ghost-purple/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm flex-shrink-0"
                  >
                    <svg 
                      className={`w-3 h-3 transition-transform duration-500 ${isRerolling ? 'animate-spin' : 'hover:rotate-180'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{isRerolling ? 'Rerolling...' : 'Reroll'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(isLoading || isRerolling) && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <EnhancedGhostLoader
              isLoading={true}
              query={isRerolling ? `Rerolling ${query}` : query}
            />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 sm:py-20">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Failed to load results'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && !isRerolling && (
          <>
            {/* Products Grid - Show by default */}
            {products.length > 0 ? (
              <>
                {/* Budget Chart for Setups */}
                {data.isSetup && data.budgetChart && (
                  <div className="mb-4 sm:mb-8">
                    <BudgetChart
                      distribution={data.budgetChart}
                      totalBudget={settings.budget}
                      currency={settings.currency}
                      chartType="pie"
                    />
                  </div>
                )}

                {/* Stats or Products View */}
                {showStats ? (
                  <StatsView
                    products={products}
                    totalCost={products.reduce((sum, p) => sum + p.price, 0)}
                    averageRating={products.reduce((sum, p) => sum + p.rating, 0) / products.length}
                    categoryDistribution={[]} // Will be calculated in StatsView component
                    currency={settings.currency}
                    onToggleView={() => setShowStats(false)}
                  />
                ) : (
                  /* Products Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSwap={handleSwap}
                        showRationale={true}
                        category={product.category}
                        isSwapping={swappingProductId === product.id}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* No Results */
              <div className="text-center py-12 sm:py-20">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms, budget, or filters to find more results.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Start New Search
                </button>
              </div>
            )}
          </>
        )}

        {/* Swap Modal */}
        {swapProduct && (
          <SwapModal
            isOpen={swapModalOpen}
            onClose={() => {
              setSwapModalOpen(false)
              setSwapProduct(null)
              setSwapAlternatives([])
            }}
            originalProduct={swapProduct}
            alternatives={swapAlternatives}
            onSelectAlternative={handleSelectAlternative}
            isLoading={isSwapping}
          />
        )}


      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
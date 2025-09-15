'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Setup, Product, SearchSettings } from '@/types'
import { ProductCard } from '@/components/product/product-card'
import { BudgetChart } from '@/components/charts/budget-chart'
import { StatsView } from '@/components/ui/stats-view'
import DotGrid from '@/components/ui/dot-grid'

interface SharedSetupResponse {
  setup: Setup
  success: boolean
  error?: string
}

export default function SharedSetupPage() {
  const params = useParams()
  const router = useRouter()
  const [showStats, setShowStats] = useState(false)
  const shareId = params.shareId as string

  // Fetch shared setup
  const { data, isLoading, error } = useQuery<SharedSetupResponse>({
    queryKey: ['shared-setup', shareId],
    queryFn: async () => {
      const response = await fetch(`/api/share/${shareId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load shared setup')
      }

      return response.json()
    },
    enabled: !!shareId,
    retry: false, // Don't retry for shared links
  })

  const handleNewSearch = () => {
    router.push('/')
  }

  const handleCreateSimilar = () => {
    if (!data?.setup) return

    const params = new URLSearchParams({
      q: data.setup.query,
      style: data.setup.settings.style,
      budget: data.setup.settings.budget.toString(),
      currency: data.setup.settings.currency,
      resultsMode: data.setup.settings.resultsMode,
      region: data.setup.settings.region,
      amazonOnly: data.setup.settings.amazonOnly.toString()
    })
    
    router.push(`/results?${params.toString()}`)
  }

  // Generate meta tags for social sharing
  useEffect(() => {
    if (data?.setup) {
      const setup = data.setup
      const totalCost = setup.products.reduce((sum, p) => sum + p.price, 0)
      const currency = setup.settings.currency
      
      // Update page title
      document.title = `${setup.query} Setup - Ghost Setup Finder`
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          `Check out this ${setup.query} setup with ${setup.products.length} products for ${currency}${totalCost.toLocaleString()}`
        )
      }
    }
  }, [data])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Background Pattern */}
      <DotGrid className="opacity-20" />
      
      {/* Header */}
      <div className="relative z-10 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm">👻</span>
                </div>
                <span className="font-semibold">Ghost Setup Finder</span>
              </button>
              
              {data?.setup && (
                <div className="hidden sm:block text-sm text-gray-500">
                  Shared Setup
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleNewSearch}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                New Search
              </button>
              
              {data?.setup && (
                <button
                  onClick={handleCreateSimilar}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Similar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading shared setup...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup not found</h3>
            <p className="text-gray-600 mb-4">
              This shared setup may have expired or the link is invalid.
            </p>
            <button
              onClick={handleNewSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Search
            </button>
          </div>
        )}

        {/* Setup Content */}
        {data?.setup && !isLoading && (
          <>
            {/* Setup Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 capitalize">
                    {data.setup.query} Setup
                  </h1>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span>{data.setup.products.length} products</span>
                    <span>•</span>
                    <span>
                      {data.setup.settings.currency}
                      {data.setup.totalCost.toLocaleString()} total
                    </span>
                    <span>•</span>
                    <span>{data.setup.settings.style} style</span>
                    <span>•</span>
                    <span>
                      Shared {new Date(data.setup.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Stats Toggle */}
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    showStats
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {showStats ? 'Show Products' : 'Show Stats'}
                </button>
              </div>

              {/* Read-only Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Shared Setup</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This is a read-only view of a shared setup. Click "Create Similar" to start your own search with these settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Chart */}
            {data.setup.budgetDistribution && data.setup.budgetDistribution.length > 0 && (
              <div className="mb-8">
                <BudgetChart
                  distribution={data.setup.budgetDistribution}
                  totalBudget={data.setup.settings.budget}
                  currency={data.setup.settings.currency}
                  chartType="pie"
                />
              </div>
            )}

            {/* Content */}
            {showStats ? (
              <StatsView
                products={data.setup.products}
                totalCost={data.setup.totalCost}
                averageRating={data.setup.products.reduce((sum, p) => sum + p.rating, 0) / data.setup.products.length}
                categoryDistribution={[]} // Will be calculated in StatsView component
                currency={data.setup.settings.currency}
                onToggleView={() => setShowStats(false)}
              />
            ) : (
              /* Products Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.setup.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSwap={() => {}} // Disabled for shared setups
                    showRationale={true}
                    category={product.category}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
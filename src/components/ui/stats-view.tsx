'use client'

import { useMemo } from 'react'
import { Product } from '@/types'
import SpotlightCard from '@/components/ui/spotlight-card'
import { PieChart } from '@/components/charts/pie-chart'
import Noise from '@/components/ui/noise'
import { Package, DollarSign, Star, TrendingUp, ShoppingBag } from 'lucide-react'

interface StatsViewProps {
  products: Product[]
  totalCost: number
  averageRating: number
  currency: string
  onToggleView: () => void
  className?: string
}

export function StatsView({
  products,
  totalCost,
  averageRating,
  currency,
  onToggleView,
  className = ''
}: StatsViewProps) {
  const formatCurrency = (amount: number) => {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$'
    } as const

    const symbol = currencySymbols[currency as keyof typeof currencySymbols] || '$'
    return `${symbol}${amount.toFixed(2)}`
  }

  // Function to categorize products based on their titles
  const categorizeProduct = (title: string): string => {
    const titleLower = title.toLowerCase()
    
    if (titleLower.includes('monitor') || titleLower.includes('display') || titleLower.includes('screen')) return 'Monitor'
    if (titleLower.includes('chair') || titleLower.includes('seat')) return 'Chair'
    if (titleLower.includes('keyboard')) return 'Keyboard'
    if (titleLower.includes('mouse') && !titleLower.includes('pad')) return 'Mouse'
    if (titleLower.includes('mouse pad') || titleLower.includes('mousepad') || titleLower.includes('pad')) return 'Mouse Pad'
    if (titleLower.includes('headset') || titleLower.includes('headphone') || titleLower.includes('earphone')) return 'Headset'
    if (titleLower.includes('speaker')) return 'Speaker'
    if (titleLower.includes('webcam') || titleLower.includes('camera')) return 'Webcam'
    if (titleLower.includes('microphone') || titleLower.includes('mic')) return 'Microphone'
    if (titleLower.includes('desk') || titleLower.includes('table')) return 'Desk'
    if (titleLower.includes('laptop')) return 'Laptop'
    if (titleLower.includes('pc') || titleLower.includes('computer') || titleLower.includes('desktop')) return 'PC'
    if (titleLower.includes('tablet')) return 'Tablet'
    if (titleLower.includes('phone')) return 'Phone'
    if (titleLower.includes('cable') || titleLower.includes('cord') || titleLower.includes('wire')) return 'Cable'
    if (titleLower.includes('stand') || titleLower.includes('mount')) return 'Stand'
    if (titleLower.includes('light') || titleLower.includes('lamp')) return 'Light'
    
    return 'Other'
  }

  // Function to clean merchant names - remove dash and everything after it
  const cleanMerchantName = (merchantName: string): string => {
    if (!merchantName) return 'Unknown'
    
    // Find the first occurrence of dash and remove it and everything after
    const dashIndex = merchantName.indexOf(' - ')
    if (dashIndex !== -1) {
      return merchantName.substring(0, dashIndex).trim()
    }
    
    // Also check for other dash formats
    const dashIndex2 = merchantName.indexOf(' -')
    if (dashIndex2 !== -1) {
      return merchantName.substring(0, dashIndex2).trim()
    }
    
    const dashIndex3 = merchantName.indexOf('- ')
    if (dashIndex3 !== -1) {
      return merchantName.substring(0, dashIndex3).trim()
    }
    
    const dashIndex4 = merchantName.indexOf('-')
    if (dashIndex4 !== -1) {
      return merchantName.substring(0, dashIndex4).trim()
    }
    
    // If no dash found, return the original name trimmed
    return merchantName.trim()
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        totalProducts: 0,
        averagePrice: 0,
        merchantStats: [],
        ratingDistribution: [],
        categoryStats: [],
        itemList: [],
        priceDistribution: []
      }
    }

    const totalProducts = products.length
    const averagePrice = totalCost / totalProducts

    // Category distribution (item types)
    const categoryCounts = products.reduce((acc, product) => {
      const category = categorizeProduct(product.title)
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const categoryStats = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    // Price distribution by individual products
    const priceDistribution = products.map(product => ({
      name: categorizeProduct(product.title),
      price: product.price,
      label: `${categorizeProduct(product.title)} - ${formatCurrency(product.price)}`
    }))

    // Create item list with simplified names
    const itemList = products.map((product, index) => ({
      index: index + 1,
      name: categorizeProduct(product.title),
      price: product.price
    }))

    // Merchant distribution
    const merchantCounts = products.reduce((acc, product) => {
      const cleanedMerchant = cleanMerchantName(product.merchant)
      acc[cleanedMerchant] = (acc[cleanedMerchant] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const merchantStats = Object.entries(merchantCounts)
      .map(([merchant, count]) => ({ merchant, count }))
      .sort((a, b) => b.count - a.count)

    // Rating distribution
    const ratingDistribution = [
      { rating: '5 Stars', count: products.filter(p => p.rating >= 4.5).length, percentage: Math.round((products.filter(p => p.rating >= 4.5).length / totalProducts) * 100) },
      { rating: '4 Stars', count: products.filter(p => p.rating >= 4.0 && p.rating < 4.5).length, percentage: Math.round((products.filter(p => p.rating >= 4.0 && p.rating < 4.5).length / totalProducts) * 100) },
      { rating: '3 Stars', count: products.filter(p => p.rating >= 3.5 && p.rating < 4.0).length, percentage: Math.round((products.filter(p => p.rating >= 3.5 && p.rating < 4.0).length / totalProducts) * 100) },
      { rating: '2 Stars', count: products.filter(p => p.rating >= 3.0 && p.rating < 3.5).length, percentage: Math.round((products.filter(p => p.rating >= 3.0 && p.rating < 3.5).length / totalProducts) * 100) },
      { rating: '1 Star', count: products.filter(p => p.rating < 3.0).length, percentage: Math.round((products.filter(p => p.rating < 3.0).length / totalProducts) * 100) }
    ]

    return {
      totalProducts,
      averagePrice,
      merchantStats,
      ratingDistribution,
      categoryStats,
      itemList,
      priceDistribution
    }
  }, [products, totalCost])



  return (
    <div className={`bg-card min-h-screen text-white relative ${className}`}>
      {/* Noise Effect */}
      <Noise 
        patternAlpha={8} 
        patternRefreshInterval={3}
        fullHeight={true}
      />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 relative z-10">
        {/* Back Button */}
        <div className="flex justify-end">
          <button
            onClick={onToggleView}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-card/50 rounded-lg hover:bg-accent transition-colors border border-border/30 backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Products</span>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-white">{stats.totalProducts}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.15)">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Cost</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(totalCost)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.15)">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Avg Price</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(stats.averagePrice)}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Avg Rating</p>
                <p className="text-3xl font-bold text-white">{averageRating.toFixed(1)}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/20">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Products List */}
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Products List</h3>
              <div className="space-y-2 sm:space-y-3 overflow-y-auto" style={{ maxHeight: 'none' }}>
                {stats.itemList.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-card/50 rounded-lg border border-border/30">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-400 w-6 sm:w-8 flex-shrink-0">{item.index}.</span>
                      <span className="font-medium text-white text-sm sm:text-base truncate">{item.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-green-400 flex-shrink-0 ml-2">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>

          {/* Price Distribution Pie Chart */}
          <PieChart
            data={{
              labels: stats.priceDistribution.map(p => p.label),
              values: stats.priceDistribution.map(p => p.price),
              colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280']
            }}
            title="Price Distribution"
            formatValue={(value) => formatCurrency(value)}
          />

          {/* Rating Distribution */}
          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Rating Distribution</h3>
              <div className="space-y-4 sm:space-y-6 max-w-md mx-auto w-full mt-8 sm:mt-16 pt-4 sm:pt-8">
                {stats.ratingDistribution.map((rating, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-300 w-16 sm:w-20 text-right">{rating.rating}</span>
                      <div className="flex-1 bg-card rounded-full h-2 sm:h-3 border border-border/30">
                        <div 
                          className="bg-yellow-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                          style={{ width: `${rating.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white ml-2 sm:ml-4 w-6 sm:w-8 text-center">{rating.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>

          {/* Products by Merchant Pie Chart */}
          <PieChart
            data={{
              labels: stats.merchantStats.map(m => m.merchant),
              values: stats.merchantStats.map(m => m.count),
              colors: ['#8B5CF6', '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280']
            }}
            title="Products by Merchant"
            formatValue={(value) => `${value} items`}
          />
        </div>

        {/* Merchant Performance */}
        <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Merchant Performance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {stats.merchantStats.slice(0, 6).map((merchant, index) => (
                <div key={index} className="p-3 sm:p-4 bg-card/50 rounded-lg border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white text-sm sm:text-base truncate">{merchant.merchant}</h4>
                    <span className="text-xs sm:text-sm text-gray-400 flex-shrink-0 ml-2">{merchant.count} products</span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    <p>Performance: <span className="font-medium text-green-400">Good</span></p>
                    <p>Avg Rating: <span className="font-medium text-yellow-400">4.2/5</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}


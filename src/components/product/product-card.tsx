'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Product } from '@/types'
import SpotlightCard from '@/components/ui/spotlight-card'

interface ProductCardProps {
  product: Product
  onSwap: (productId: string) => void
  showRationale?: boolean
  category?: string
  isSwapping?: boolean
  className?: string
}

const MERCHANT_COLORS = {
  Amazon: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'Best Buy': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Walmart: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  Target: 'bg-red-500/10 text-red-400 border border-red-500/20',
  Newegg: 'bg-muted text-muted-foreground border border-border',
  default: 'bg-muted text-muted-foreground border border-border'
} as const

export function ProductCard({
  product,
  onSwap,
  showRationale = true,
  category,
  isSwapping = false,
  className = ''
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)

  const formatPrice = (price: number, currency: string) => {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$'
    } as const

    const symbol = currencySymbols[currency as keyof typeof currencySymbols] || '$'
    return `${symbol}${price.toLocaleString()}`
  }

  const getMerchantColor = (merchant: string) => {
    return MERCHANT_COLORS[merchant as keyof typeof MERCHANT_COLORS] || MERCHANT_COLORS.default
  }

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div className="flex items-center space-x-1">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg key={`full-${i}`} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="half-star">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              fill="url(#half-star)"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg key={`empty-${i}`} className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}

        <span className="text-sm text-muted-foreground ml-2">
          {rating.toFixed(1)} ({product.reviewCount.toLocaleString()})
        </span>
      </div>
    )
  }



  return (
    <SpotlightCard 
      className={`relative transition-all duration-300 hover:scale-[1.02] ${className}`}
      spotlightColor="rgba(59, 130, 246, 0.15)"
    >
      {/* Header with Category and Confidence Badge */}
      <div className="flex items-start justify-between mb-4">
        {/* Category Badge */}
        {category && (
          <span className="inline-block px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20 max-w-[70%] truncate">
            {category}
          </span>
        )}
        
        {/* Confidence Badge */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md shadow-lg flex-shrink-0 ${product.confidence >= 0.8
          ? 'bg-green-500/90 text-white border-green-400/50'
          : product.confidence >= 0.6
            ? 'bg-yellow-500/90 text-white border-yellow-400/50'
            : 'bg-red-500/90 text-white border-red-400/50'
          }`}>
          {Math.round(product.confidence * 100)}% match
        </div>
      </div>

      {/* Product Image */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6">
        {!imageError ? (
          <>
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-contain p-6 transition-all duration-300 hover:scale-105"
              style={{
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15)) contrast(1.1) saturate(1.1)',
                backgroundColor: 'transparent'
              }}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setImageError(true)
                setIsImageLoading(false)
              }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="space-y-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-2 min-h-[3rem]">
          {product.title}
        </h3>

        {/* Price and Merchant */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-foreground">
            {formatPrice(product.price, product.currency)}
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getMerchantColor(product.merchant.split(' - ')[0])}`}>
            {product.merchant.split(' - ')[0]}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center">
          {renderStars(product.rating)}
        </div>

        {/* Features */}
        {product.features && product.features.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2">
              {product.features.slice(0, 3).map((feature, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-muted text-muted-foreground text-xs rounded-md border border-border"
                >
                  {feature}
                </span>
              ))}
              {product.features.length > 3 && (
                <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs rounded-md border border-border">
                  +{product.features.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rationale */}
        {showRationale && product.rationale && (
          <div className="bg-card/50 p-3 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3 min-h-[4.5rem]">
              {product.rationale}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-center py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
          >
            View Product
          </a>

          <button
            onClick={() => onSwap(product.id)}
            disabled={isSwapping}
            className="px-4 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSwapping ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Swapping...</span>
              </div>
            ) : (
              'Swap'
            )}
          </button>
        </div>
      </div>
    </SpotlightCard>
  )
}
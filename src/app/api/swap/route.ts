import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchProducts } from '@/lib/api/serpapi'
import { rankProducts } from '@/lib/api/gemini'
import { getCachedData, setCachedData } from '@/lib/cache'
import { ExternalAPIError, handleAPIError } from '@/lib/errors'
import { Product } from '@/types'
import { SearchRequest } from '@/types/api'

/**
 * Generate intelligent search query for finding product alternatives
 */
function generateSwapSearchQuery(category?: string, productTitle?: string): string {
  // If we have a category, use it as the primary search term
  if (category) {
    return category
  }
  
  // If we have a product title, extract the product type from it
  if (productTitle) {
    const title = productTitle.toLowerCase()
    
    // Extract product type keywords from title
    const productTypes = [
      'laptop', 'computer', 'pc', 'desktop', 'monitor', 'screen', 'display',
      'chair', 'desk', 'table', 'keyboard', 'mouse', 'headset', 'headphones',
      'mattress', 'bed', 'pillow', 'sheets', 'dresser', 'nightstand',
      'sofa', 'couch', 'tv', 'television', 'coffee table', 'lamp',
      'refrigerator', 'fridge', 'stove', 'microwave', 'cookware', 'knife'
    ]
    
    // Find the first matching product type
    for (const type of productTypes) {
      if (title.includes(type)) {
        return type
      }
    }
    
    // If no specific type found, use the first few words of the title
    const words = productTitle.split(' ').slice(0, 3).join(' ')
    return words
  }
  
  // Fallback to generic search
  return 'alternative product'
}

// Force Node.js runtime for external SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SwapRequestSchema = z.object({
  productId: z.string(),
  category: z.string().optional(),
  productTitle: z.string().optional(),
  budget: z.number().positive(),
  settings: z.object({
    style: z.enum(['Premium', 'Casual']),
    region: z.string().default('US'), // Default to US if not provided
    amazonOnly: z.boolean(),
    currency: z.string()
  }),
  excludeIds: z.array(z.string()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, category, productTitle, budget, settings, excludeIds = [] } = SwapRequestSchema.parse(body)

    // Create cache key for swap results
    const cacheKey = `swap:${productId}:${JSON.stringify({ category, productTitle, budget, settings, excludeIds })}`
    
    // Check cache first
    const cached = await getCachedData<Product[]>(cacheKey)
    if (cached) {
      return NextResponse.json({
        alternatives: cached,
        fromCache: true
      })
    }

    // Generate intelligent search query based on product information
    const searchQuery = generateSwapSearchQuery(category, productTitle)
    console.log(`🔄 Swap request for product ${productId}:`, {
      category,
      productTitle,
      searchQuery,
      budget,
      excludeIds: excludeIds.length
    })
    
    // Search for alternative products with better parameters
    const searchRequest: SearchRequest = {
      query: searchQuery,
      category,
      budget: budget * 1.2, // Allow slightly higher budget for more options
      currency: settings.currency as 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD',
      amazonOnly: settings.amazonOnly,
      limit: 15 // Get more options to filter from
    }
    
    const searchResponse = await searchProducts(searchRequest)

    if (!searchResponse.products || searchResponse.products.length === 0) {
      throw new ExternalAPIError(
        'No alternative products found',
        'SWAP_NO_RESULTS',
        false
      )
    }

    // Filter out excluded products (original + any previously swapped)
    const filteredProducts = searchResponse.products.filter(
      product => !excludeIds.includes(product.id)
    )

    if (filteredProducts.length === 0) {
      console.warn(`⚠️ No new alternatives found for product ${productId} after filtering ${searchResponse.products.length} results`)
      throw new ExternalAPIError(
        'No new alternatives available. Try adjusting your budget or search criteria.',
        'SWAP_NO_NEW_RESULTS',
        false
      )
    }

    console.log(`🔍 Found ${filteredProducts.length} alternatives after filtering from ${searchResponse.products.length} results`)

    // Rank the alternative products with swap-optimized criteria
    const rankResponse = await rankProducts({
      products: filteredProducts,
      criteria: {
        priceWeight: 0.25,      // Price is important but not everything
        ratingWeight: 0.35,     // Prioritize highly rated alternatives
        reviewWeight: 0.25,     // Good review count indicates reliability
        relevanceWeight: 0.15   // Relevance to search query
      },
      userPreferences: {
        style: settings.style,
        budget,
        prioritizeRating: true
      }
    })

    // Return top 5 alternatives for better choice
    const alternatives = rankResponse.rankedProducts.slice(0, 5)

    console.log(`✅ Swap successful: Found ${alternatives.length} alternatives for "${searchQuery}"`)

    // Cache the results for 30 minutes
    await setCachedData(cacheKey, alternatives, 1800)

    return NextResponse.json({
      alternatives,
      fromCache: false
    })

  } catch (error) {
    return handleAPIError(error)
  }
}
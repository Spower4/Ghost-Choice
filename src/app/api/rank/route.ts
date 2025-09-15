import { NextRequest, NextResponse } from 'next/server'
import { RankRequestSchema } from '@/lib/validation'

// Force Node.js runtime for external SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { rankProducts } from '@/lib/api/gemini'
import { handleZodError } from '@/lib/errors'
import { RankRequest, RankResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = RankRequestSchema.parse(body)

    // Short-circuit if no products provided
    if (!Array.isArray(validatedRequest.products) || validatedRequest.products.length === 0) {
      return NextResponse.json({ 
        rankedProducts: [], 
        reasoning: ['No products provided for ranking'] 
      })
    }

    // Validate ranking criteria weights sum to reasonable value
    const totalWeight = Object.values(validatedRequest.criteria).reduce((sum, weight) => sum + weight, 0)
    if (totalWeight === 0) {
      // Use default weights if all are zero
      const defaultRequest: RankRequest = {
        ...validatedRequest,
        criteria: {
          priceWeight: 0.25,
          ratingWeight: 0.25,
          reviewWeight: 0.25,
          relevanceWeight: 0.25
        }
      }
      const defaultRankResponse = await rankProducts(defaultRequest)
      
      return NextResponse.json(defaultRankResponse)
    }

    // Rank products using Gemini AI (with heuristic fallback)
    const rankResponse = await rankProducts(validatedRequest)

    // Ensure products are properly scored and sorted
    const finalResponse: RankResponse = {
      rankedProducts: rankResponse.rankedProducts.map((product, index) => ({
        ...product,
        searchRank: index + 1 // Ensure proper ranking
      })),
      reasoning: rankResponse.reasoning
    }

    return NextResponse.json(finalResponse)
  } catch (error) {
    console.error('Ranking API error:', error)
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      const validationError = handleZodError(error)
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          type: 'VALIDATION_ERROR',
          details: validationError.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Ranking service failed',
        type: 'EXTERNAL_API_ERROR'
      },
      { status: 502 }
    )
  }
}
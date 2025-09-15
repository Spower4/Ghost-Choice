import { NextRequest, NextResponse } from 'next/server'
import { SceneRequestSchema } from '@/lib/validation'
import { generateScene, generateSceneVariations } from '@/lib/api/gemini-image'
import { ValidationError, handleZodError } from '@/lib/errors'

// Force Node.js runtime for external SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = SceneRequestSchema.parse(body)

    // Check if multiple variations are requested
    const url = new URL(request.url)
    const variationsParam = url.searchParams.get('variations')
    const variationCount = variationsParam ? Math.min(parseInt(variationsParam), 5) : 1

    // For now, generate scenes directly without caching
    // TODO: Implement proper caching for scene responses

    // Generate scene(s) using Gemini Image API
    let sceneResponse
    
    if (variationCount > 1) {
      // Generate multiple variations
      const variations = await generateSceneVariations(validatedRequest, variationCount)
      sceneResponse = {
        scenes: variations,
        count: variations.length,
        style: validatedRequest.style,
        productCount: validatedRequest.products.length
      }
    } else {
      // Generate single scene
      const scene = await generateScene(validatedRequest)
      sceneResponse = {
        scenes: [scene],
        count: 1,
        style: validatedRequest.style,
        productCount: validatedRequest.products.length
      }
    }

    // Add metadata
    const finalResponse = {
      ...sceneResponse,
      metadata: {
        generatedAt: new Date().toISOString(),
        style: validatedRequest.style,
        roomType: validatedRequest.roomType || 'inferred',
        productTitles: validatedRequest.products.slice(0, 3).map(p => p.title),
        estimatedGenerationTime: estimateGenerationTime(
          validatedRequest.products.length, 
          variationCount
        )
      }
    }

    // TODO: Cache the response

    return NextResponse.json(finalResponse)
  } catch (error) {
    console.error('AI Scene API error:', error)
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      const validationError = handleZodError(error)
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationError.message,
          type: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Estimate scene generation time
 */
function estimateGenerationTime(productCount: number, variationCount: number = 1): number {
  const baseTime = 30 // seconds
  const timePerProduct = 5 // seconds
  const timePerVariation = 20 // seconds
  
  return baseTime + (productCount * timePerProduct) + ((variationCount - 1) * timePerVariation)
}
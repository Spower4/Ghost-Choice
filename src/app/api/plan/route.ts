import { NextRequest, NextResponse } from 'next/server'
import { PlanRequestSchema } from '@/lib/validation'

// Force Node.js runtime for external SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { generatePlan } from '@/lib/api/gemini'
import { ValidationError, handleZodError } from '@/lib/errors'
import { cacheSearchResults, getCachedSearchResults } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = PlanRequestSchema.parse(body)

    // For now, generate plan directly without caching
    // TODO: Implement proper caching for plan responses
    const planResponse = await generatePlan(validatedRequest)

    return NextResponse.json(planResponse)
  } catch (error) {
    console.error('Planning API error:', error)
    
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
        error: 'Planning service failed',
        type: 'EXTERNAL_API_ERROR'
      },
      { status: 502 }
    )
  }
}
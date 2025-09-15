import { NextRequest, NextResponse } from 'next/server'
import { ShareRequestSchema } from '@/lib/validation'
import { ValidationError, handleZodError } from '@/lib/errors'
import { redis, generateKey, TTL } from '@/lib/redis'
import { generateUniqueShareId, isValidShareId } from '@/lib/share-id'
import { ShareResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = ShareRequestSchema.parse(body)

    // Generate unique share ID
    const shareId = await generateUniqueShareId(async (id: string) => {
      const key = generateKey('SHARED_SETUP', id)
      const exists = await redis.exists(key)
      return exists === 1
    })

    // Prepare setup data for storage
    const setupData = {
      ...validatedRequest.setup,
      shareId,
      sharedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TTL.SHARED_SETUP * 1000).toISOString()
    }

    // Store in Redis with expiration
    const key = generateKey('SHARED_SETUP', shareId)
    await redis.setex(key, TTL.SHARED_SETUP, JSON.stringify(setupData))

    // Generate short URL (in production, this would be your domain)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const shortUrl = `${baseUrl}/shared/${shareId}`

    const response: ShareResponse = {
      shareId,
      shortUrl,
      expiresAt: new Date(Date.now() + TTL.SHARED_SETUP * 1000)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Share API error:', error)
    
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

export async function GET(request: NextRequest) {
  try {
    // Extract share ID from URL
    const url = new URL(request.url)
    const shareId = url.searchParams.get('id')

    if (!shareId) {
      return NextResponse.json(
        { 
          error: 'Share ID is required',
          type: 'MISSING_SHARE_ID'
        },
        { status: 400 }
      )
    }

    // Validate share ID format
    if (!isValidShareId(shareId)) {
      return NextResponse.json(
        { 
          error: 'Invalid share ID format',
          type: 'INVALID_SHARE_ID'
        },
        { status: 400 }
      )
    }

    // Retrieve setup from Redis
    const key = generateKey('SHARED_SETUP', shareId)
    const setupData = await redis.get(key)

    if (!setupData) {
      return NextResponse.json(
        { 
          error: 'Shared setup not found or expired',
          type: 'SETUP_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Parse and return setup data
    const parsedSetup = typeof setupData === 'string' 
      ? JSON.parse(setupData) 
      : setupData

    // Update access metadata (optional - for analytics)
    const accessData = {
      lastAccessed: new Date().toISOString(),
      accessCount: (parsedSetup.accessCount || 0) + 1
    }

    // Update the setup with access metadata (extend TTL on access)
    const updatedSetup = { ...parsedSetup, ...accessData }
    await redis.setex(key, TTL.SHARED_SETUP, JSON.stringify(updatedSetup))

    // Return setup data without internal metadata
    const { sharedAt, accessCount, lastAccessed, ...publicSetup } = updatedSetup

    return NextResponse.json({
      setup: publicSetup,
      metadata: {
        shareId,
        sharedAt,
        expiresAt: parsedSetup.expiresAt,
        accessCount,
        lastAccessed
      }
    })
  } catch (error) {
    console.error('Share retrieval API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
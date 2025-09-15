import { NextRequest, NextResponse } from 'next/server'
import { getCachedSearchResult } from '@/lib/search-cache'

export async function GET(
  request: NextRequest,
  { params }: { params: { searchId: string } }
) {
  try {
    const { searchId } = params
    
    if (!searchId) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      )
    }

    const cachedResult = getCachedSearchResult(searchId)
    
    if (!cachedResult) {
      return NextResponse.json(
        { error: 'Cached results not found or expired' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        query: cachedResult.query,
        settings: cachedResult.settings,
        results: cachedResult.results,
        productCount: cachedResult.productCount,
        createdAt: cachedResult.createdAt
      }
    })

  } catch (error) {
    console.error('Error retrieving cached results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
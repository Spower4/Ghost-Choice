import { NextRequest, NextResponse } from 'next/server'
import { getCachedSearchResult } from '@/lib/search-cache'

// In-memory storage for saved search IDs (in production, use database)
const savedSearchIds = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const { searchId } = await request.json()
    
    if (!searchId) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      )
    }

    // Verify the search exists
    const cachedResult = getCachedSearchResult(searchId)
    if (!cachedResult) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      )
    }

    // Add to saved searches
    savedSearchIds.add(searchId)
    console.log(`💾 Saved search: ${searchId} - "${cachedResult.query}"`)

    return NextResponse.json({
      success: true,
      message: 'Search saved successfully'
    })

  } catch (error) {
    console.error('Error saving search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return list of saved search IDs
    return NextResponse.json({
      success: true,
      data: Array.from(savedSearchIds)
    })

  } catch (error) {
    console.error('Error retrieving saved search IDs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchId = searchParams.get('id')
    
    if (!searchId) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      )
    }

    // Remove from saved searches
    const wasRemoved = savedSearchIds.delete(searchId)
    
    if (!wasRemoved) {
      return NextResponse.json(
        { error: 'Search was not saved' },
        { status: 404 }
      )
    }

    console.log(`🗑️ Unsaved search: ${searchId}`)

    return NextResponse.json({
      success: true,
      message: 'Search unsaved successfully'
    })

  } catch (error) {
    console.error('Error unsaving search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
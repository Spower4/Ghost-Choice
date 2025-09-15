import { NextRequest, NextResponse } from 'next/server'
import { getAllCachedSearches, deleteCachedSearch } from '@/lib/search-cache'

// Get saved search IDs from the save-search API
async function getSavedSearchIds(request: NextRequest): Promise<string[]> {
  try {
    const response = await fetch(`${request.nextUrl.origin}/api/save-search`)
    if (response.ok) {
      const data = await response.json()
      return data.data || []
    }
  } catch (error) {
    console.error('Error fetching saved search IDs:', error)
  }
  return []
}

export async function GET(request: NextRequest) {
  try {
    const allSearches = getAllCachedSearches()
    const savedSearchIds = await getSavedSearchIds(request)
    
    // Return only saved searches
    const savedSearches = allSearches.filter(search => 
      savedSearchIds.includes(search.id)
    )
    
    const searchList = savedSearches.map(search => ({
      id: search.id,
      query: search.query,
      settings: search.settings,
      createdAt: search.createdAt,
      productCount: search.productCount
    }))

    return NextResponse.json({
      success: true,
      data: searchList
    })

  } catch (error) {
    console.error('Error retrieving saved searches:', error)
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

    const deleted = deleteCachedSearch(searchId)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Search deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting saved search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
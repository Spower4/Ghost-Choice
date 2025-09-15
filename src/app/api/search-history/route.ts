import { NextRequest, NextResponse } from 'next/server'
import { getAllCachedSearches } from '@/lib/search-cache'

export async function GET(request: NextRequest) {
  try {
    const allSearches = getAllCachedSearches()
    
    // Get saved search IDs
    const savedResponse = await fetch(`${request.nextUrl.origin}/api/save-search`)
    let savedSearchIds: string[] = []
    
    if (savedResponse.ok) {
      const savedData = await savedResponse.json()
      savedSearchIds = savedData.data || []
    }

    // Mark searches as saved or not
    const historyData = allSearches.map(search => ({
      id: search.id,
      query: search.query,
      settings: search.settings,
      createdAt: search.createdAt,
      productCount: search.productCount,
      isSaved: savedSearchIds.includes(search.id)
    }))

    return NextResponse.json({
      success: true,
      data: historyData
    })

  } catch (error) {
    console.error('Error retrieving search history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
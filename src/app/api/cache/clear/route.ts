import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function POST(req: NextRequest) {
  try {
    // Clear all search-related cache keys
    const searchKeys = await redis.keys('search:*')
    const genericKeys = await redis.keys('generic:*')
    
    const allKeys = [...searchKeys, ...genericKeys]
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
      console.log(`Cleared ${allKeys.length} cache keys`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Cleared ${allKeys.length} cache entries`,
      clearedKeys: allKeys.length
    })
  } catch (error) {
    console.error('Cache clear error:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
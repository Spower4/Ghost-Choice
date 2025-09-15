import { redis, generateKey, generateCacheHash, TTL } from './redis'
import type { Product, SearchSettings, Setup } from '@/types'

export interface CachedSearchResult {
  products: Product[]
  searchMetadata: {
    query: string
    totalResults: number
    searchedAt: string
    region: string
  }
  ghostTips: string[]
  isSetup: boolean
}

export interface CachedSetup {
  id: string
  query: string
  products: Product[]
  budgetDistribution?: Array<{
    category: string
    amount: number
    percentage: number
    color: string
  }>
  totalCost: number
  settings: SearchSettings
  createdAt: string
}

/**
 * Cache search results with TTL
 */
export async function cacheSearchResults(
  query: string,
  settings: SearchSettings,
  results: CachedSearchResult
): Promise<void> {
  try {
    const cacheKey = generateSearchCacheKey(query, settings)
    const key = generateKey('SEARCH_RESULTS', cacheKey)
    
    await redis.setex(key, TTL.SEARCH_RESULTS, JSON.stringify(results))
  } catch (error) {
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Retrieve cached search results
 */
export async function getCachedSearchResults(
  query: string,
  settings: SearchSettings
): Promise<CachedSearchResult | null> {
  try {
    const cacheKey = generateSearchCacheKey(query, settings)
    const key = generateKey('SEARCH_RESULTS', cacheKey)
    
    const cached = await redis.get(key)
    if (!cached) return null
    
    return JSON.parse(cached as string) as CachedSearchResult
  } catch (error) {
    return null
  }
}

/**
 * Store shared setup with TTL
 */
export async function storeSharedSetup(
  shareId: string,
  setup: CachedSetup
): Promise<void> {
  try {
    const key = generateKey('SHARED_SETUP', shareId)
    await redis.setex(key, TTL.SHARED_SETUP, JSON.stringify(setup))
  } catch (error) {
    throw new Error('Failed to create shareable link')
  }
}

/**
 * Retrieve shared setup by share ID
 */
export async function getSharedSetup(shareId: string): Promise<CachedSetup | null> {
  try {
    const key = generateKey('SHARED_SETUP', shareId)
    const cached = await redis.get(key)
    
    if (!cached) return null
    
    return JSON.parse(cached as string) as CachedSetup
  } catch (error) {
    return null
  }
}

/**
 * Delete cached search results (for cache invalidation)
 */
export async function invalidateSearchCache(
  query: string,
  settings: SearchSettings
): Promise<void> {
  try {
    const cacheKey = generateSearchCacheKey(query, settings)
    const key = generateKey('SEARCH_RESULTS', cacheKey)
    await redis.del(key)
  } catch (error) {
    // Silent fail
  }
}

/**
 * Delete shared setup
 */
export async function deleteSharedSetup(shareId: string): Promise<void> {
  try {
    const key = generateKey('SHARED_SETUP', shareId)
    await redis.del(key)
  } catch (error) {
    throw new Error('Failed to delete shared setup')
  }
}

/**
 * Generate cache key for search results
 */
function generateSearchCacheKey(query: string, settings: SearchSettings): string {
  const cacheData = {
    query: query.toLowerCase().trim(),
    style: settings.style,
    budget: settings.budget,
    currency: settings.currency,
    resultsMode: settings.resultsMode,
    region: settings.region,
    amazonOnly: settings.amazonOnly,
    cacheVersion: 'v2', // Version to avoid old cache conflicts
    timestamp: Math.floor(Date.now() / (1000 * 60 * 10)) // 10-minute cache buckets
  }
  
  return generateCacheHash(cacheData)
}

/**
 * Generic cache data storage
 */
export async function setCachedData<T>(
  key: string,
  data: T,
  ttlSeconds: number = TTL.SEARCH_RESULTS
): Promise<void> {
  try {
    const cacheKey = generateKey('GENERIC', key)
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Generic cache data retrieval
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = generateKey('GENERIC', key)
    const cached = await redis.get(cacheKey)
    
    if (!cached) return null
    
    return JSON.parse(cached as string) as T
  } catch (error) {
    return null
  }
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping()
    return result === 'PONG'
  } catch (error) {
    return false
  }
}

/**
 * Get cache statistics (for monitoring)
 */
export async function getCacheStats(): Promise<{
  searchCacheSize: number
  sharedSetupsCount: number
}> {
  try {
    const searchKeys = await redis.keys(`${generateKey('SEARCH_RESULTS', '')}*`)
    const setupKeys = await redis.keys(`${generateKey('SHARED_SETUP', '')}*`)
    
    return {
      searchCacheSize: searchKeys.length,
      sharedSetupsCount: setupKeys.length,
    }
  } catch (error) {
    return {
      searchCacheSize: 0,
      sharedSetupsCount: 0,
    }
  }
}
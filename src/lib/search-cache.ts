// Search result caching system
import { SearchSettings } from '@/types'

export interface CachedSearchResult {
  id: string
  query: string
  settings: SearchSettings
  results: any[] // The actual product results
  createdAt: Date
  productCount: number
}

// In-memory cache (in production, use Redis or database)
const searchCache = new Map<string, CachedSearchResult>()

export function saveSearchResults(
  query: string, 
  settings: SearchSettings, 
  results: any[]
): string {
  const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const cachedResult: CachedSearchResult = {
    id: searchId,
    query,
    settings,
    results,
    createdAt: new Date(),
    productCount: results.length
  }
  
  searchCache.set(searchId, cachedResult)
  
  return searchId
}

export function getCachedSearchResult(searchId: string): CachedSearchResult | null {
  const result = searchCache.get(searchId)
  return result || null
}

export function getAllCachedSearches(): CachedSearchResult[] {
  return Array.from(searchCache.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function deleteCachedSearch(searchId: string): boolean {
  const deleted = searchCache.delete(searchId)
  return deleted
}
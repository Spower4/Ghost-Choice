import { Redis } from '@upstash/redis'

// Initialize Redis client with Upstash configuration
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Redis key prefixes for different data types
export const REDIS_KEYS = {
  SEARCH_RESULTS: 'search:',
  SHARED_SETUP: 'setup:',
  USER_SESSION: 'session:',
  RATE_LIMIT: 'rate:',
} as const

// TTL constants (in seconds)
export const TTL = {
  SEARCH_RESULTS: 60 * 60, // 1 hour
  SHARED_SETUP: 60 * 60 * 24 * 7, // 7 days
  USER_SESSION: 60 * 60 * 24, // 24 hours
  RATE_LIMIT: 60, // 1 minute
} as const

/**
 * Generate Redis key with proper prefix
 */
export function generateKey(prefix: keyof typeof REDIS_KEYS, identifier: string): string {
  return `${REDIS_KEYS[prefix]}${identifier}`
}

/**
 * Generate hash for cache key from object
 */
export function generateCacheHash(data: Record<string, any>): string {
  const sortedKeys = Object.keys(data).sort()
  const hashString = sortedKeys
    .map(key => `${key}:${JSON.stringify(data[key])}`)
    .join('|')
  
  // Simple hash function for cache keys
  let hash = 0
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { redis, generateKey, generateCacheHash, REDIS_KEYS, TTL } from '../redis'

// Mock the Redis client
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    ping: vi.fn(),
    keys: vi.fn(),
  })),
}))

describe('Redis utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateKey', () => {
    it('should generate correct key with prefix', () => {
      const key = generateKey('SEARCH_RESULTS', 'test123')
      expect(key).toBe('search:test123')
    })

    it('should generate correct key for shared setup', () => {
      const key = generateKey('SHARED_SETUP', 'abc123')
      expect(key).toBe('setup:abc123')
    })

    it('should generate correct key for user session', () => {
      const key = generateKey('USER_SESSION', 'user456')
      expect(key).toBe('session:user456')
    })

    it('should generate correct key for rate limit', () => {
      const key = generateKey('RATE_LIMIT', 'ip123')
      expect(key).toBe('rate:ip123')
    })
  })

  describe('generateCacheHash', () => {
    it('should generate consistent hash for same data', () => {
      const data = { query: 'office', budget: 1000, style: 'Premium' }
      const hash1 = generateCacheHash(data)
      const hash2 = generateCacheHash(data)
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different data', () => {
      const data1 = { query: 'office', budget: 1000 }
      const data2 = { query: 'gaming', budget: 1000 }
      const hash1 = generateCacheHash(data1)
      const hash2 = generateCacheHash(data2)
      expect(hash1).not.toBe(hash2)
    })

    it('should generate same hash regardless of key order', () => {
      const data1 = { query: 'office', budget: 1000, style: 'Premium' }
      const data2 = { budget: 1000, style: 'Premium', query: 'office' }
      const hash1 = generateCacheHash(data1)
      const hash2 = generateCacheHash(data2)
      expect(hash1).toBe(hash2)
    })

    it('should handle nested objects', () => {
      const data = {
        query: 'office',
        settings: { budget: 1000, style: 'Premium' }
      }
      const hash = generateCacheHash(data)
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should return string hash', () => {
      const data = { test: 'value' }
      const hash = generateCacheHash(data)
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^[a-z0-9]+$/)
    })
  })

  describe('REDIS_KEYS constants', () => {
    it('should have correct key prefixes', () => {
      expect(REDIS_KEYS.SEARCH_RESULTS).toBe('search:')
      expect(REDIS_KEYS.SHARED_SETUP).toBe('setup:')
      expect(REDIS_KEYS.USER_SESSION).toBe('session:')
      expect(REDIS_KEYS.RATE_LIMIT).toBe('rate:')
    })
  })

  describe('TTL constants', () => {
    it('should have reasonable TTL values', () => {
      expect(TTL.SEARCH_RESULTS).toBe(3600) // 1 hour
      expect(TTL.SHARED_SETUP).toBe(604800) // 7 days
      expect(TTL.USER_SESSION).toBe(86400) // 24 hours
      expect(TTL.RATE_LIMIT).toBe(60) // 1 minute
    })
  })
})
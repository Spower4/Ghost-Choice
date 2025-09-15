import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  cacheSearchResults,
  getCachedSearchResults,
  storeSharedSetup,
  getSharedSetup,
  invalidateSearchCache,
  deleteSharedSetup,
  checkRedisHealth,
  getCacheStats,
  type CachedSearchResult,
  type CachedSetup,
} from '../cache'
import type { SearchSettings } from '@/types'

// Mock the Redis module
vi.mock('../redis', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    redis: {
      setex: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      ping: vi.fn(),
      keys: vi.fn(),
    },
    generateKey: vi.fn((prefix, id) => `${prefix}:${id}`),
  }
})

const mockRedis = vi.mocked(await import('../redis')).redis
const mockGenerateKey = vi.mocked(await import('../redis')).generateKey

describe('Cache utilities', () => {
  const mockSearchSettings: SearchSettings = {
    style: 'Premium',
    budget: 1000,
    currency: 'USD',
    resultsMode: 'Multiple',
    region: 'US',
    amazonOnly: false,
  }

  const mockSearchResult: CachedSearchResult = {
    products: [
      {
        id: '1',
        title: 'Test Product',
        price: 100,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 100,
        imageUrl: 'https://example.com/image.jpg',
        productUrl: 'https://example.com/product',
        rationale: 'Great product',
        features: ['Feature 1'],
        pros: ['Pro 1'],
        cons: ['Con 1'],
        confidence: 0.9,
        searchRank: 1,
      },
    ],
    searchMetadata: {
      query: 'office chair',
      totalResults: 1,
      searchedAt: '2024-01-01T00:00:00Z',
      region: 'US',
    },
    ghostTips: ['Great choice!'],
    isSetup: false,
  }

  const mockSetup: CachedSetup = {
    id: 'setup123',
    query: 'office setup',
    products: mockSearchResult.products,
    totalCost: 1000,
    settings: mockSearchSettings,
    createdAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cacheSearchResults', () => {
    it('should cache search results successfully', async () => {
      mockRedis.setex.mockResolvedValue('OK')
      mockGenerateKey.mockReturnValue('SEARCH_RESULTS:test-key')

      await cacheSearchResults('office chair', mockSearchSettings, mockSearchResult)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'SEARCH_RESULTS:test-key',
        3600,
        JSON.stringify(mockSearchResult)
      )
    })

    it('should handle caching errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(
        cacheSearchResults('office chair', mockSearchSettings, mockSearchResult)
      ).resolves.not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to cache search results:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('getCachedSearchResults', () => {
    it('should retrieve cached search results', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSearchResult))
      mockGenerateKey.mockReturnValue('SEARCH_RESULTS:test-key')

      const result = await getCachedSearchResults('office chair', mockSearchSettings)

      expect(result).toEqual(mockSearchResult)
      expect(mockRedis.get).toHaveBeenCalledWith('SEARCH_RESULTS:test-key')
    })

    it('should return null when no cache exists', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await getCachedSearchResults('office chair', mockSearchSettings)

      expect(result).toBeNull()
    })

    it('should handle retrieval errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await getCachedSearchResults('office chair', mockSearchSettings)

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve cached search results:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('storeSharedSetup', () => {
    it('should store shared setup successfully', async () => {
      mockRedis.setex.mockResolvedValue('OK')
      mockGenerateKey.mockReturnValue('SHARED_SETUP:abc123')

      await storeSharedSetup('abc123', mockSetup)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'SHARED_SETUP:abc123',
        604800,
        JSON.stringify(mockSetup)
      )
    })

    it('should throw error when storage fails', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(storeSharedSetup('abc123', mockSetup)).rejects.toThrow('Failed to create shareable link')

      consoleSpy.mockRestore()
    })
  })

  describe('getSharedSetup', () => {
    it('should retrieve shared setup', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSetup))
      mockGenerateKey.mockReturnValue('SHARED_SETUP:abc123')

      const result = await getSharedSetup('abc123')

      expect(result).toEqual(mockSetup)
      expect(mockRedis.get).toHaveBeenCalledWith('SHARED_SETUP:abc123')
    })

    it('should return null when setup does not exist', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await getSharedSetup('abc123')

      expect(result).toBeNull()
    })

    it('should handle retrieval errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await getSharedSetup('abc123')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve shared setup:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('invalidateSearchCache', () => {
    it('should delete cached search results', async () => {
      mockRedis.del.mockResolvedValue(1)
      mockGenerateKey.mockReturnValue('SEARCH_RESULTS:test-key')

      await invalidateSearchCache('office chair', mockSearchSettings)

      expect(mockRedis.del).toHaveBeenCalledWith('SEARCH_RESULTS:test-key')
    })

    it('should handle deletion errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(invalidateSearchCache('office chair', mockSearchSettings)).resolves.not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to invalidate search cache:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('deleteSharedSetup', () => {
    it('should delete shared setup', async () => {
      mockRedis.del.mockResolvedValue(1)
      mockGenerateKey.mockReturnValue('SHARED_SETUP:abc123')

      await deleteSharedSetup('abc123')

      expect(mockRedis.del).toHaveBeenCalledWith('SHARED_SETUP:abc123')
    })

    it('should throw error when deletion fails', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(deleteSharedSetup('abc123')).rejects.toThrow('Failed to delete shared setup')

      consoleSpy.mockRestore()
    })
  })

  describe('checkRedisHealth', () => {
    it('should return true when Redis is healthy', async () => {
      mockRedis.ping.mockResolvedValue('PONG')

      const result = await checkRedisHealth()

      expect(result).toBe(true)
      expect(mockRedis.ping).toHaveBeenCalled()
    })

    it('should return false when Redis is unhealthy', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await checkRedisHealth()

      expect(result).toBe(false)
      consoleSpy.mockRestore()
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.keys
        .mockResolvedValueOnce(['search:key1', 'search:key2'])
        .mockResolvedValueOnce(['setup:key1'])

      const stats = await getCacheStats()

      expect(stats).toEqual({
        searchCacheSize: 2,
        sharedSetupsCount: 1,
      })
    })

    it('should handle errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const stats = await getCacheStats()

      expect(stats).toEqual({
        searchCacheSize: 0,
        sharedSetupsCount: 0,
      })
      consoleSpy.mockRestore()
    })
  })
})
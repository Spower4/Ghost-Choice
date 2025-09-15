import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import { redis } from '@/lib/redis'
import { generateUniqueShareId } from '@/lib/share-id'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/redis')
vi.mock('@/lib/share-id')

const mockRedis = vi.mocked(redis)
const mockGenerateUniqueShareId = vi.mocked(generateUniqueShareId)

describe('/api/share', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_BASE_URL = 'https://ghostsetup.com'
  })

  const mockSetup = {
    query: 'office setup',
    products: [
      {
        id: 'desk1',
        title: 'Standing Desk Pro',
        price: 399.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1250,
        imageUrl: 'https://example.com/desk1.jpg',
        productUrl: 'https://amazon.com/desk1',
        rationale: 'Great desk for office setup',
        category: 'Desk',
        features: [],
        pros: ['Adjustable height'],
        cons: [],
        confidence: 0.9,
        searchRank: 1
      }
    ],
    budgetDistribution: [
      {
        category: 'Desk',
        amount: 400,
        percentage: 40,
        color: '#FF6B6B'
      }
    ],
    totalCost: 399.99,
    settings: {
      style: 'Premium' as const,
      budget: 1000,
      currency: 'USD',
      resultsMode: 'Multiple' as const,
      region: 'US' as const,
      amazonOnly: false
    }
  }

  const validShareRequest = {
    setup: mockSetup
  }

  describe('POST /api/share', () => {
    it('should create a shared setup successfully', async () => {
      const mockShareId = 'abc123XY'
      mockGenerateUniqueShareId.mockResolvedValue(mockShareId)
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest('http://localhost:3000/api/share', {
        method: 'POST',
        body: JSON.stringify(validShareRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.shareId).toBe(mockShareId)
      expect(data.shortUrl).toBe(`https://ghostsetup.com/shared/${mockShareId}`)
      expect(data.expiresAt).toBeDefined()
      expect(new Date(data.expiresAt)).toBeInstanceOf(Date)

      expect(mockGenerateUniqueShareId).toHaveBeenCalled()
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `setup:${mockShareId}`,
        604800, // 7 days in seconds
        expect.stringContaining(mockShareId)
      )
    })

    it('should validate request data', async () => {
      const invalidRequest = {
        setup: {
          query: '', // Invalid: empty query
          products: [], // Invalid: empty products
          totalCost: -100, // Invalid: negative cost
          settings: {
            style: 'Invalid',
            budget: -100
          }
        }
      }

      const request = new NextRequest('http://localhost:3000/api/share', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(mockGenerateUniqueShareId).not.toHaveBeenCalled()
    })

    it('should handle Redis errors', async () => {
      const mockShareId = 'abc123XY'
      mockGenerateUniqueShareId.mockResolvedValue(mockShareId)
      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'))

      const request = new NextRequest('http://localhost:3000/api/share', {
        method: 'POST',
        body: JSON.stringify(validShareRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should use localhost URL when NEXT_PUBLIC_BASE_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL

      const mockShareId = 'abc123XY'
      mockGenerateUniqueShareId.mockResolvedValue(mockShareId)
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest('http://localhost:3000/api/share', {
        method: 'POST',
        body: JSON.stringify(validShareRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.shortUrl).toBe(`http://localhost:3000/shared/${mockShareId}`)
    })

    it('should handle share ID generation failures', async () => {
      mockGenerateUniqueShareId.mockRejectedValue(new Error('Failed to generate unique ID'))

      const request = new NextRequest('http://localhost:3000/api/share', {
        method: 'POST',
        body: JSON.stringify(validShareRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should store complete setup data with metadata', async () => {
      const mockShareId = 'abc123XY'
      mockGenerateUniqueShareId.mockResolvedValue(mockShareId)
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest('http://localhost:3000/api/share', {
        method: 'POST',
        body: JSON.stringify(validShareRequest)
      })

      await POST(request)

      const storedData = JSON.parse(mockRedis.setex.mock.calls[0][2] as string)
      expect(storedData.shareId).toBe(mockShareId)
      expect(storedData.sharedAt).toBeDefined()
      expect(storedData.expiresAt).toBeDefined()
      expect(storedData.query).toBe(mockSetup.query)
      expect(storedData.products).toEqual(mockSetup.products)
    })
  })

  describe('GET /api/share', () => {
    const mockShareId = 'abc123XY'
    const mockStoredSetup = {
      ...mockSetup,
      shareId: mockShareId,
      sharedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-08T00:00:00.000Z',
      accessCount: 5
    }

    it('should retrieve shared setup successfully', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockStoredSetup))
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest(`http://localhost:3000/api/share?id=${mockShareId}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.setup.query).toBe(mockSetup.query)
      expect(data.setup.products).toEqual(mockSetup.products)
      expect(data.metadata.shareId).toBe(mockShareId)
      expect(data.metadata.accessCount).toBe(6) // Incremented
      expect(data.metadata.lastAccessed).toBeDefined()

      expect(mockRedis.get).toHaveBeenCalledWith(`setup:${mockShareId}`)
      expect(mockRedis.setex).toHaveBeenCalled() // Updates access metadata
    })

    it('should return 400 when share ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/share', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Share ID is required')
      expect(data.type).toBe('MISSING_SHARE_ID')
      expect(mockRedis.get).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid share ID format', async () => {
      const invalidShareId = 'invalid-id-with-special-chars!'

      const request = new NextRequest(`http://localhost:3000/api/share?id=${invalidShareId}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid share ID format')
      expect(data.type).toBe('INVALID_SHARE_ID')
      expect(mockRedis.get).not.toHaveBeenCalled()
    })

    it('should return 404 when setup is not found', async () => {
      mockRedis.get.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/share?id=${mockShareId}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Shared setup not found or expired')
      expect(data.type).toBe('SETUP_NOT_FOUND')
      expect(mockRedis.get).toHaveBeenCalledWith(`setup:${mockShareId}`)
    })

    it('should handle Redis errors during retrieval', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

      const request = new NextRequest(`http://localhost:3000/api/share?id=${mockShareId}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle non-JSON stored data', async () => {
      mockRedis.get.mockResolvedValue(mockStoredSetup) // Return object directly
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest(`http://localhost:3000/api/share?id=${mockShareId}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.setup.query).toBe(mockSetup.query)
    })

    it('should initialize access count for first access', async () => {
      const setupWithoutAccessCount = {
        ...mockStoredSetup
      }
      delete (setupWithoutAccessCount as any).accessCount

      mockRedis.get.mockResolvedValue(JSON.stringify(setupWithoutAccessCount))
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest(`http://localhost:3000/api/share?id=${mockShareId}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.accessCount).toBe(1) // First access
    })

    it('should not expose internal metadata in setup response', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockStoredSetup))
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest(`http://localhost:3000/api/share?id=${mockShareId}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.setup.shareId).toBeUndefined()
      expect(data.setup.sharedAt).toBeUndefined()
      expect(data.setup.accessCount).toBeUndefined()
      expect(data.setup.lastAccessed).toBeUndefined()
      
      // But metadata should contain these
      expect(data.metadata.shareId).toBe(mockShareId)
      expect(data.metadata.sharedAt).toBeDefined()
      expect(data.metadata.accessCount).toBeDefined()
    })

    it('should extend TTL on access', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockStoredSetup))
      mockRedis.setex.mockResolvedValue('OK')

      const request = new NextRequest(`http://localhost:3000/api/share?id=${mockShareId}`, {
        method: 'GET'
      })

      await GET(request)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `setup:${mockShareId}`,
        604800, // 7 days TTL
        expect.any(String)
      )
    })
  })
})
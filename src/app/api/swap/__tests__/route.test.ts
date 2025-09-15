import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock external dependencies
vi.mock('@/lib/api/serpapi', () => ({
  searchProducts: vi.fn()
}))

vi.mock('@/lib/api/gemini', () => ({
  rankProducts: vi.fn()
}))

vi.mock('@/lib/cache', () => ({
  getCachedData: vi.fn(),
  setCachedData: vi.fn()
}))

const { searchProducts } = await import('@/lib/api/serpapi')
const { rankProducts } = await import('@/lib/api/gemini')
const { getCachedData, setCachedData } = await import('@/lib/cache')

describe('/api/swap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
  }

  const validSwapRequest = {
    productId: 'product-1',
    category: 'chair',
    budget: 500,
    settings: {
      style: 'Premium' as const,
      region: 'US',
      amazonOnly: false,
      currency: 'USD'
    },
    excludeIds: ['product-1', 'product-2']
  }

  const mockSearchResponse = {
    products: [
      {
        id: 'alt-1',
        title: 'Alternative Chair 1',
        price: 450,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 100,
        imageUrl: 'https://example.com/chair1.jpg',
        productUrl: 'https://example.com/chair1',
        category: 'chair'
      },
      {
        id: 'alt-2',
        title: 'Alternative Chair 2',
        price: 480,
        currency: 'USD',
        merchant: 'Best Buy',
        rating: 4.3,
        reviewCount: 80,
        imageUrl: 'https://example.com/chair2.jpg',
        productUrl: 'https://example.com/chair2',
        category: 'chair'
      }
    ],
    totalResults: 2,
    searchMetadata: {
      totalResults: 2,
      searchTime: 150,
      region: 'US',
      query: 'chair'
    }
  }

  const mockRankResponse = {
    rankedProducts: [
      {
        id: 'alt-1',
        title: 'Alternative Chair 1',
        price: 450,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 100,
        imageUrl: 'https://example.com/chair1.jpg',
        productUrl: 'https://example.com/chair1',
        rationale: 'Great value for money with excellent reviews',
        category: 'chair',
        features: ['Ergonomic', 'Adjustable'],
        pros: ['Comfortable', 'Durable'],
        cons: ['Assembly required'],
        confidence: 0.9,
        searchRank: 1
      },
      {
        id: 'alt-2',
        title: 'Alternative Chair 2',
        price: 480,
        currency: 'USD',
        merchant: 'Best Buy',
        rating: 4.3,
        reviewCount: 80,
        imageUrl: 'https://example.com/chair2.jpg',
        productUrl: 'https://example.com/chair2',
        rationale: 'Good alternative with solid build quality',
        category: 'chair',
        features: ['Mesh back', 'Lumbar support'],
        pros: ['Breathable', 'Supportive'],
        cons: ['Higher price'],
        confidence: 0.8,
        searchRank: 2
      }
    ],
    reasoning: ['Ranked by value and reviews']
  }

  it('should return cached alternatives when available', async () => {
    vi.mocked(getCachedData).mockResolvedValue(mockRankResponse.rankedProducts)

    const request = mockRequest(validSwapRequest)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.alternatives).toEqual(mockRankResponse.rankedProducts)
    expect(data.fromCache).toBe(true)
    expect(searchProducts).not.toHaveBeenCalled()
    expect(rankProducts).not.toHaveBeenCalled()
  })

  it('should search and rank alternatives when not cached', async () => {
    vi.mocked(getCachedData).mockResolvedValue(null)
    vi.mocked(searchProducts).mockResolvedValue(mockSearchResponse)
    vi.mocked(rankProducts).mockResolvedValue(mockRankResponse)
    vi.mocked(setCachedData).mockResolvedValue(undefined)

    const request = mockRequest(validSwapRequest)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.alternatives).toHaveLength(2)
    expect(data.fromCache).toBe(false)
    
    expect(searchProducts).toHaveBeenCalledWith({
      query: 'chair',
      category: 'chair',
      budget: 500,
      region: 'US',
      amazonOnly: false,
      limit: 10
    })

    expect(rankProducts).toHaveBeenCalledWith({
      products: mockSearchResponse.products,
      criteria: {
        priceWeight: 0.3,
        ratingWeight: 0.3,
        reviewWeight: 0.2,
        relevanceWeight: 0.2
      },
      userPreferences: {
        style: 'Premium',
        budget: 500,
        prioritizeRating: true
      }
    })

    expect(setCachedData).toHaveBeenCalledWith(
      expect.stringContaining('swap:product-1:'),
      mockRankResponse.rankedProducts.slice(0, 3),
      1800
    )
  })

  it('should filter out excluded products', async () => {
    const searchResponseWithExcluded = {
      ...mockSearchResponse,
      products: [
        ...mockSearchResponse.products,
        {
          id: 'product-2', // This should be filtered out
          title: 'Excluded Chair',
          price: 400,
          currency: 'USD',
          merchant: 'Target',
          rating: 4.0,
          reviewCount: 50,
          imageUrl: 'https://example.com/excluded.jpg',
          productUrl: 'https://example.com/excluded',
          category: 'chair'
        }
      ]
    }

    vi.mocked(getCachedData).mockResolvedValue(null)
    vi.mocked(searchProducts).mockResolvedValue(searchResponseWithExcluded)
    vi.mocked(rankProducts).mockResolvedValue(mockRankResponse)

    const request = mockRequest(validSwapRequest)
    const response = await POST(request)

    expect(response.status).toBe(200)
    
    // Verify that rankProducts was called with filtered products (excluding product-2)
    expect(rankProducts).toHaveBeenCalledWith({
      products: mockSearchResponse.products, // Should not include product-2
      criteria: expect.any(Object),
      userPreferences: expect.any(Object)
    })
  })

  it('should return top 3 alternatives only', async () => {
    const manyAlternatives = Array.from({ length: 5 }, (_, i) => ({
      id: `alt-${i + 1}`,
      title: `Alternative ${i + 1}`,
      price: 400 + i * 10,
      currency: 'USD',
      merchant: 'Amazon',
      rating: 4.0 + i * 0.1,
      reviewCount: 100,
      imageUrl: `https://example.com/alt${i + 1}.jpg`,
      productUrl: `https://example.com/alt${i + 1}`,
      rationale: `Alternative ${i + 1} rationale`,
      category: 'chair',
      features: [],
      pros: [],
      cons: [],
      confidence: 0.8,
      searchRank: i + 1
    }))

    const rankResponseWithMany = {
      ...mockRankResponse,
      rankedProducts: manyAlternatives
    }

    vi.mocked(getCachedData).mockResolvedValue(null)
    vi.mocked(searchProducts).mockResolvedValue(mockSearchResponse)
    vi.mocked(rankProducts).mockResolvedValue(rankResponseWithMany)

    const request = mockRequest(validSwapRequest)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.alternatives).toHaveLength(3)
    expect(data.alternatives[0].id).toBe('alt-1')
    expect(data.alternatives[2].id).toBe('alt-3')
  })

  it('should handle validation errors', async () => {
    const invalidRequest = {
      productId: '', // Invalid empty string
      budget: -100, // Invalid negative budget
      settings: {
        style: 'Invalid' // Invalid style
      }
    }

    const request = mockRequest(invalidRequest)
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should handle no search results', async () => {
    vi.mocked(getCachedData).mockResolvedValue(null)
    vi.mocked(searchProducts).mockResolvedValue({
      products: [],
      totalResults: 0,
      searchMetadata: {
        totalResults: 0,
        searchTime: 100,
        region: 'US',
        query: 'chair'
      }
    })

    const request = mockRequest(validSwapRequest)
    const response = await POST(request)

    expect(response.status).toBe(502)
    
    const data = await response.json()
    expect(data.code).toBe('SWAP_NO_RESULTS')
  })

  it('should handle no new alternatives after filtering', async () => {
    const searchResponseOnlyExcluded = {
      products: [
        {
          id: 'product-1', // This will be filtered out
          title: 'Original Product',
          price: 500,
          currency: 'USD',
          merchant: 'Amazon',
          rating: 4.0,
          reviewCount: 100,
          imageUrl: 'https://example.com/original.jpg',
          productUrl: 'https://example.com/original',
          category: 'chair'
        }
      ],
      totalResults: 1,
      searchMetadata: {
        totalResults: 1,
        searchTime: 100,
        region: 'US',
        query: 'chair'
      }
    }

    vi.mocked(getCachedData).mockResolvedValue(null)
    vi.mocked(searchProducts).mockResolvedValue(searchResponseOnlyExcluded)

    const request = mockRequest(validSwapRequest)
    const response = await POST(request)

    expect(response.status).toBe(502)
    
    const data = await response.json()
    expect(data.code).toBe('SWAP_NO_NEW_RESULTS')
  })

  it('should use generic search query when no category provided', async () => {
    const requestWithoutCategory = {
      ...validSwapRequest,
      category: undefined
    }

    vi.mocked(getCachedData).mockResolvedValue(null)
    vi.mocked(searchProducts).mockResolvedValue(mockSearchResponse)
    vi.mocked(rankProducts).mockResolvedValue(mockRankResponse)

    const request = mockRequest(requestWithoutCategory)
    const response = await POST(request)

    expect(response.status).toBe(200)
    
    expect(searchProducts).toHaveBeenCalledWith({
      query: 'alternative product',
      category: undefined,
      budget: 500,
      region: 'US',
      amazonOnly: false,
      limit: 10
    })
  })
})
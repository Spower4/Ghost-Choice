import { NextRequest } from 'next/server'
import { POST } from '../route'
import { rankProducts } from '@/lib/api/gemini'
import { getCachedData, setCachedData } from '@/lib/cache'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/api/gemini')
vi.mock('@/lib/cache')

const mockRankProducts = vi.mocked(rankProducts)
const mockGetCachedData = vi.mocked(getCachedData)
const mockSetCachedData = vi.mocked(setCachedData)

describe('/api/rank', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedData.mockResolvedValue(null)
    mockSetCachedData.mockResolvedValue(undefined)
  })

  const mockRawProducts = [
    {
      id: 'chair1',
      title: 'Ergonomic Office Chair',
      price: 299.99,
      currency: 'USD',
      merchant: 'Amazon',
      rating: 4.5,
      reviewCount: 1250,
      imageUrl: 'https://example.com/chair1.jpg',
      productUrl: 'https://amazon.com/chair1',
      category: 'Office Furniture'
    },
    {
      id: 'chair2',
      title: 'Gaming Chair Pro',
      price: 399.99,
      currency: 'USD',
      merchant: 'Best Buy',
      rating: 4.2,
      reviewCount: 850,
      imageUrl: 'https://example.com/chair2.jpg',
      productUrl: 'https://bestbuy.com/chair2',
      category: 'Gaming'
    },
    {
      id: 'chair3',
      title: 'Budget Office Chair',
      price: 150.00,
      currency: 'USD',
      merchant: 'Walmart',
      rating: 3.8,
      reviewCount: 420,
      imageUrl: 'https://example.com/chair3.jpg',
      productUrl: 'https://walmart.com/chair3',
      category: 'Office Furniture'
    }
  ]

  const validRankRequest = {
    products: mockRawProducts,
    criteria: {
      priceWeight: 0.3,
      ratingWeight: 0.3,
      reviewWeight: 0.2,
      relevanceWeight: 0.2
    },
    userPreferences: {
      style: 'Premium' as const,
      budget: 500,
      prioritizeRating: true
    }
  }

  const mockRankResponse = {
    rankedProducts: [
      {
        ...mockRawProducts[0],
        rationale: 'Excellent balance of price, rating, and reviews',
        pros: ['Excellent rating', 'Well-reviewed', 'Fast shipping available'],
        cons: [],
        confidence: 0.9,
        searchRank: 1,
        features: []
      },
      {
        ...mockRawProducts[2],
        rationale: 'Great value for money with decent rating',
        pros: ['Good value', 'Decent review count'],
        cons: ['Lower rating'],
        confidence: 0.7,
        searchRank: 2,
        features: []
      },
      {
        ...mockRawProducts[1],
        rationale: 'High price but good quality',
        pros: ['Good rating', 'Decent review count'],
        cons: [],
        confidence: 0.8,
        searchRank: 3,
        features: []
      }
    ],
    reasoning: [
      'Ranked based on price-to-value ratio and user ratings',
      'Prioritized products with higher ratings as requested'
    ]
  }

  it('should rank products successfully', async () => {
    mockRankProducts.mockResolvedValue(mockRankResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(validRankRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.rankedProducts).toHaveLength(3)
    expect(data.rankedProducts[0].searchRank).toBe(1)
    expect(data.rankedProducts[1].searchRank).toBe(2)
    expect(data.rankedProducts[2].searchRank).toBe(3)
    expect(data.reasoning).toHaveLength(2)
    expect(mockRankProducts).toHaveBeenCalledWith(validRankRequest)
    expect(mockSetCachedData).toHaveBeenCalled()
  })

  it('should return cached ranking if available', async () => {
    mockGetCachedData.mockResolvedValue(mockRankResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(validRankRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockRankResponse)
    expect(mockRankProducts).not.toHaveBeenCalled()
    expect(mockGetCachedData).toHaveBeenCalled()
  })

  it('should validate request data', async () => {
    const invalidRequest = {
      products: [], // Invalid: empty products array
      criteria: {
        priceWeight: -0.1, // Invalid: negative weight
        ratingWeight: 1.5, // Invalid: weight > 1
        reviewWeight: 'invalid', // Invalid: not a number
        relevanceWeight: 0.2
      },
      userPreferences: {
        style: 'Invalid',
        budget: -100,
        prioritizeRating: 'not-boolean'
      }
    }

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(invalidRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.type).toBe('VALIDATION_ERROR')
    expect(mockRankProducts).not.toHaveBeenCalled()
  })

  it('should handle zero weights with default criteria', async () => {
    const zeroWeightRequest = {
      ...validRankRequest,
      criteria: {
        priceWeight: 0,
        ratingWeight: 0,
        reviewWeight: 0,
        relevanceWeight: 0
      }
    }

    const defaultRankResponse = {
      ...mockRankResponse,
      reasoning: ['Used default ranking criteria due to zero weights']
    }

    mockRankProducts.mockResolvedValue(defaultRankResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(zeroWeightRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.rankedProducts).toHaveLength(3)
    // Should have called with default weights (0.25 each)
    expect(mockRankProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        criteria: {
          priceWeight: 0.25,
          ratingWeight: 0.25,
          reviewWeight: 0.25,
          relevanceWeight: 0.25
        }
      })
    )
  })

  it('should handle different user preferences', async () => {
    const casualRequest = {
      ...validRankRequest,
      userPreferences: {
        style: 'Casual' as const,
        budget: 200,
        prioritizeRating: false
      }
    }

    mockRankProducts.mockResolvedValue(mockRankResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(casualRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockRankProducts).toHaveBeenCalledWith(casualRequest)
  })

  it('should handle price-focused ranking', async () => {
    const priceRequest = {
      ...validRankRequest,
      criteria: {
        priceWeight: 0.7,
        ratingWeight: 0.1,
        reviewWeight: 0.1,
        relevanceWeight: 0.1
      }
    }

    mockRankProducts.mockResolvedValue(mockRankResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(priceRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockRankProducts).toHaveBeenCalledWith(priceRequest)
  })

  it('should handle rating-focused ranking', async () => {
    const ratingRequest = {
      ...validRankRequest,
      criteria: {
        priceWeight: 0.1,
        ratingWeight: 0.7,
        reviewWeight: 0.1,
        relevanceWeight: 0.1
      },
      userPreferences: {
        ...validRankRequest.userPreferences,
        prioritizeRating: true
      }
    }

    mockRankProducts.mockResolvedValue(mockRankResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(ratingRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockRankProducts).toHaveBeenCalledWith(ratingRequest)
  })

  it('should handle Gemini AI errors gracefully', async () => {
    mockRankProducts.mockRejectedValue(new Error('Gemini AI error'))

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(validRankRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
    expect(mockRankProducts).toHaveBeenCalledWith(validRankRequest)
  })

  it('should handle single product ranking', async () => {
    const singleProductRequest = {
      ...validRankRequest,
      products: [mockRawProducts[0]]
    }

    const singleProductResponse = {
      rankedProducts: [
        {
          ...mockRawProducts[0],
          rationale: 'Only product available',
          pros: ['Excellent rating', 'Well-reviewed'],
          cons: [],
          confidence: 1.0,
          searchRank: 1,
          features: []
        }
      ],
      reasoning: ['Single product ranking']
    }

    mockRankProducts.mockResolvedValue(singleProductResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(singleProductRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.rankedProducts).toHaveLength(1)
    expect(data.rankedProducts[0].searchRank).toBe(1)
  })

  it('should preserve product data integrity', async () => {
    mockRankProducts.mockResolvedValue(mockRankResponse)

    const request = new NextRequest('http://localhost:3000/api/rank', {
      method: 'POST',
      body: JSON.stringify(validRankRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    
    // Check that original product data is preserved
    const rankedProduct = data.rankedProducts[0]
    expect(rankedProduct.id).toBe(mockRawProducts[0].id)
    expect(rankedProduct.title).toBe(mockRawProducts[0].title)
    expect(rankedProduct.price).toBe(mockRawProducts[0].price)
    expect(rankedProduct.merchant).toBe(mockRawProducts[0].merchant)
    
    // Check that ranking data is added
    expect(rankedProduct.rationale).toBeDefined()
    expect(rankedProduct.pros).toBeDefined()
    expect(rankedProduct.confidence).toBeDefined()
    expect(rankedProduct.searchRank).toBeDefined()
  })
})
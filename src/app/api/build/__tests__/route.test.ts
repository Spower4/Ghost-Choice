import { NextRequest } from 'next/server'
import { POST } from '../route'
import { generatePlan, rankProducts, generateGhostTips } from '@/lib/api/gemini'
import { searchProducts } from '@/lib/api/serpapi'
import { getCachedData, setCachedData } from '@/lib/cache'

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for internal API calls
global.fetch = vi.fn()

// Mock dependencies
vi.mock('@/lib/api/gemini')
vi.mock('@/lib/api/serpapi')
vi.mock('@/lib/cache')

const mockGeneratePlan = vi.mocked(generatePlan)
const mockSearchProducts = vi.mocked(searchProducts)
const mockRankProducts = vi.mocked(rankProducts)
const mockGenerateGhostTips = vi.mocked(generateGhostTips)
const mockGetCachedData = vi.mocked(getCachedData)
const mockSetCachedData = vi.mocked(setCachedData)

describe('/api/build', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedData.mockResolvedValue(null)
    mockSetCachedData.mockResolvedValue(undefined)
  })

  const validBuildRequest = {
    query: 'office setup',
    settings: {
      style: 'Premium' as const,
      budget: 1000,
      currency: 'USD',
      resultsMode: 'Multiple' as const,
      region: 'US' as const,
      amazonOnly: false
    }
  }

  const mockPlanResponse = {
    categories: [
      {
        category: 'Desk',
        priority: 1,
        budgetAllocation: 400,
        searchTerms: ['office desk', 'standing desk'],
        requirements: ['Ergonomic', 'Sturdy']
      },
      {
        category: 'Chair',
        priority: 2,
        budgetAllocation: 300,
        searchTerms: ['office chair', 'ergonomic chair'],
        requirements: ['Lumbar support', 'Adjustable']
      }
    ],
    budgetDistribution: [
      {
        category: 'Desk',
        amount: 400,
        percentage: 40,
        color: '#FF6B6B'
      },
      {
        category: 'Chair',
        amount: 300,
        percentage: 30,
        color: '#4ECDC4'
      }
    ],
    searchStrategy: {
      approach: 'setup' as const,
      categories: ['Desk', 'Chair'],
      totalItems: 2
    }
  }

  const mockSearchResponse = {
    products: [
      {
        id: 'desk1',
        title: 'Standing Desk Pro',
        url: 'https://amazon.com/desk1',
        price: 399.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1250,
        image: 'https://example.com/desk1.jpg'
      }
    ],
    totalResults: 1,
    searchMetadata: {
      totalResults: 1,
      searchTime: 1500,
      region: 'US',
      query: 'office desk standing desk'
    }
  }

  const mockRankResponse = {
    rankedProducts: [
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
        rationale: 'Excellent standing desk with great reviews',
        pros: ['Excellent rating', 'Well-reviewed', 'Fast shipping available'],
        cons: [],
        confidence: 0.9,
        searchRank: 1,
        features: []
      }
    ],
    reasoning: ['Ranked based on rating and review count']
  }

  const mockGhostTips = [
    'Found great office products! 👻',
    'Standing desks are trending this month',
    'Check for ergonomic certifications'
  ]

  it('should orchestrate complete setup build successfully', async () => {
    mockGeneratePlan.mockResolvedValue(mockPlanResponse)
    mockSearchProducts.mockResolvedValue(mockSearchResponse)
    mockRankProducts.mockResolvedValue(mockRankResponse)
    mockGenerateGhostTips.mockResolvedValue(mockGhostTips)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(validBuildRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(2) // One product per category
    expect(data.budgetChart).toBeDefined()
    expect(data.ghostTips).toEqual(mockGhostTips)
    expect(data.isSetup).toBe(true)
    expect(data.searchMetadata).toBeDefined()

    // Verify orchestration calls
    expect(mockGeneratePlan).toHaveBeenCalledWith({
      query: 'office setup',
      budget: 1000,
      style: 'Premium',
      region: 'US'
    })
    expect(mockSearchProducts).toHaveBeenCalledTimes(2) // Once per category
    expect(mockRankProducts).toHaveBeenCalledTimes(2)
    expect(mockGenerateGhostTips).toHaveBeenCalled()
    expect(mockSetCachedData).toHaveBeenCalled()
  })

  it('should handle single item build', async () => {
    const singleItemRequest = {
      query: 'gaming chair',
      settings: {
        ...validBuildRequest.settings,
        resultsMode: 'Single' as const
      }
    }

    const singleItemPlan = {
      categories: [
        {
          category: 'Gaming Chair',
          priority: 1,
          budgetAllocation: 1000,
          searchTerms: ['gaming chair'],
          requirements: ['Comfortable', 'Durable']
        }
      ],
      budgetDistribution: [
        {
          category: 'Gaming Chair',
          amount: 1000,
          percentage: 100,
          color: '#FF6B6B'
        }
      ],
      searchStrategy: {
        approach: 'single' as const,
        categories: ['Gaming Chair'],
        totalItems: 1
      }
    }

    mockGeneratePlan.mockResolvedValue(singleItemPlan)
    mockSearchProducts.mockResolvedValue(mockSearchResponse)
    mockRankProducts.mockResolvedValue({
      ...mockRankResponse,
      rankedProducts: mockRankResponse.rankedProducts.slice(0, 3) // Up to 3 for single items
    })
    mockGenerateGhostTips.mockResolvedValue(mockGhostTips)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(singleItemRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isSetup).toBe(false)
    expect(data.budgetChart).toBeUndefined() // No budget chart for single items
    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10 // Higher limit for single items
      })
    )
  })

  it('should return cached build if available', async () => {
    const cachedBuild = {
      products: mockRankResponse.rankedProducts,
      budgetChart: mockPlanResponse.budgetDistribution,
      ghostTips: mockGhostTips,
      searchMetadata: mockSearchResponse.searchMetadata,
      isSetup: true
    }

    mockGetCachedData.mockResolvedValue(cachedBuild)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(validBuildRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(cachedBuild)
    expect(mockGeneratePlan).not.toHaveBeenCalled()
    expect(mockSearchProducts).not.toHaveBeenCalled()
    expect(mockGetCachedData).toHaveBeenCalled()
  })

  it('should validate request data', async () => {
    const invalidRequest = {
      query: '', // Invalid: empty query
      settings: {
        style: 'Invalid',
        budget: -100,
        currency: 'XXX',
        resultsMode: 'Invalid',
        region: 'XX',
        amazonOnly: 'not-boolean'
      }
    }

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(invalidRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.type).toBe('VALIDATION_ERROR')
    expect(mockGeneratePlan).not.toHaveBeenCalled()
  })

  it('should use static fallback plan on Gemini 429 error', async () => {
    // Mock Gemini 429 rate limit error
    const rateLimitError = new Error('Rate limit exceeded')
    ;(rateLimitError as any).status = 429
    mockGeneratePlan.mockRejectedValue(rateLimitError)
    
    // Mock the internal search API call
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: [
          {
            id: '1',
            title: 'Test Desk',
            url: 'https://example.com/desk',
            price: 350,
            currency: 'USD',
            merchant: 'Amazon',
            rating: 4.3,
            reviewCount: 200,
            image: 'desk.jpg'
          }
        ]
      })
    } as any)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify({
        query: 'gaming setup',
        settings: {
          style: 'Premium',
          budget: 1000,
          currency: 'USD',
          resultsMode: 'Multiple',
          region: 'US',
          amazonOnly: false
        }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Plan-Fallback')).toBe('static')
    expect(data.products.length).toBeGreaterThan(0)
    expect(data.isSetup).toBe(true)
    
    // Should have used static plan with multiple needs for setup
    expect(mockGeneratePlan).toHaveBeenCalled()
  })

  it('should handle planning failures gracefully', async () => {
    mockGeneratePlan.mockRejectedValue(new Error('Planning failed'))

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(validBuildRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
    expect(mockGeneratePlan).toHaveBeenCalled()
  })

  it('should handle search failures for individual categories', async () => {
    mockGeneratePlan.mockResolvedValue(mockPlanResponse)
    
    // First search succeeds, second fails
    mockSearchProducts
      .mockResolvedValueOnce(mockSearchResponse)
      .mockRejectedValueOnce(new Error('Search failed'))
    
    mockRankProducts.mockResolvedValue(mockRankResponse)
    mockGenerateGhostTips.mockResolvedValue(mockGhostTips)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(validBuildRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(1) // Only one category succeeded
    expect(mockSearchProducts).toHaveBeenCalledTimes(2)
  })

  it('should handle empty search results', async () => {
    mockGeneratePlan.mockResolvedValue(mockPlanResponse)
    mockSearchProducts.mockResolvedValue({
      products: [],
      totalResults: 0,
      searchMetadata: {
        totalResults: 0,
        searchTime: 500,
        region: 'US',
        query: 'office desk standing desk'
      }
    })
    mockGenerateGhostTips.mockResolvedValue([
      'No products found for your search 👻',
      'Try adjusting your budget or search terms'
    ])

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(validBuildRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(0)
    expect(data.ghostTips).toContain('No products found for your search 👻')
  })

  it('should use correct ranking criteria for Premium style', async () => {
    mockGeneratePlan.mockResolvedValue(mockPlanResponse)
    mockSearchProducts.mockResolvedValue(mockSearchResponse)
    mockRankProducts.mockResolvedValue(mockRankResponse)
    mockGenerateGhostTips.mockResolvedValue(mockGhostTips)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(validBuildRequest)
    })

    await POST(request)

    expect(mockRankProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        criteria: {
          priceWeight: 0.2,
          ratingWeight: 0.4,
          reviewWeight: 0.3,
          relevanceWeight: 0.1
        },
        userPreferences: {
          style: 'Premium',
          budget: 1000,
          prioritizeRating: true
        }
      })
    )
  })

  it('should use correct ranking criteria for Casual style', async () => {
    const casualRequest = {
      ...validBuildRequest,
      settings: {
        ...validBuildRequest.settings,
        style: 'Casual' as const
      }
    }

    mockGeneratePlan.mockResolvedValue(mockPlanResponse)
    mockSearchProducts.mockResolvedValue(mockSearchResponse)
    mockRankProducts.mockResolvedValue(mockRankResponse)
    mockGenerateGhostTips.mockResolvedValue(mockGhostTips)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(casualRequest)
    })

    await POST(request)

    expect(mockRankProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        criteria: {
          priceWeight: 0.4,
          ratingWeight: 0.3,
          reviewWeight: 0.2,
          relevanceWeight: 0.1
        },
        userPreferences: {
          style: 'Casual',
          budget: 1000,
          prioritizeRating: false
        }
      })
    )
  })

  it('should handle Amazon-only filtering', async () => {
    const amazonOnlyRequest = {
      ...validBuildRequest,
      settings: {
        ...validBuildRequest.settings,
        amazonOnly: true
      }
    }

    mockGeneratePlan.mockResolvedValue(mockPlanResponse)
    mockSearchProducts.mockResolvedValue(mockSearchResponse)
    mockRankProducts.mockResolvedValue(mockRankResponse)
    mockGenerateGhostTips.mockResolvedValue(mockGhostTips)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(amazonOnlyRequest)
    })

    await POST(request)

    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        amazonOnly: true
      })
    )
  })

  it('should add category information to products', async () => {
    mockGeneratePlan.mockResolvedValue(mockPlanResponse)
    mockSearchProducts.mockResolvedValue(mockSearchResponse)
    mockRankProducts.mockResolvedValue(mockRankResponse)
    mockGenerateGhostTips.mockResolvedValue(mockGhostTips)

    const request = new NextRequest('http://localhost:3000/api/build', {
      method: 'POST',
      body: JSON.stringify(validBuildRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products[0].category).toBe('Desk')
    expect(data.products[1].category).toBe('Chair')
  })
})
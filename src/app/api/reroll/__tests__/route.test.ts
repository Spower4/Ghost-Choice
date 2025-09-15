import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock fetch for internal API calls
global.fetch = vi.fn()

describe('/api/reroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/reroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
  }

  const validRerollRequest = {
    originalQuery: 'office setup',
    settings: {
      style: 'Premium' as const,
      budget: 1000,
      currency: 'USD',
      resultsMode: 'Multiple' as const,
      region: 'US',
      amazonOnly: false
    },
    excludeIds: ['product-1', 'product-2']
  }

  const mockBuildResponse = {
    products: [
      {
        id: 'new-product-1',
        title: 'New Office Chair',
        price: 300,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 100,
        imageUrl: 'https://example.com/chair.jpg',
        productUrl: 'https://example.com/chair',
        rationale: 'Great ergonomic chair',
        category: 'chair',
        features: ['Ergonomic'],
        pros: ['Comfortable'],
        cons: ['Assembly required'],
        confidence: 0.9,
        searchRank: 1
      },
      {
        id: 'new-product-2',
        title: 'New Standing Desk',
        price: 500,
        currency: 'USD',
        merchant: 'Best Buy',
        rating: 4.3,
        reviewCount: 80,
        imageUrl: 'https://example.com/desk.jpg',
        productUrl: 'https://example.com/desk',
        rationale: 'Adjustable height desk',
        category: 'desk',
        features: ['Height adjustable'],
        pros: ['Sturdy', 'Adjustable'],
        cons: ['Heavy'],
        confidence: 0.8,
        searchRank: 2
      }
    ],
    budgetChart: [
      {
        category: 'chair',
        amount: 300,
        percentage: 30,
        color: '#3B82F6'
      },
      {
        category: 'desk',
        amount: 500,
        percentage: 50,
        color: '#10B981'
      }
    ],
    ghostTips: ['Great office setup!', 'Perfect for productivity!'],
    searchMetadata: {
      totalResults: 2,
      searchTime: 150,
      region: 'US',
      query: 'office setup'
    },
    isSetup: true
  }

  it('should successfully reroll setup', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBuildResponse
    } as Response)

    const request = mockRequest(validRerollRequest)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(2)
    expect(data.products[0].id).toBe('new-product-1')
    expect(data.products[1].id).toBe('new-product-2')
    expect(data.budgetChart).toEqual(mockBuildResponse.budgetChart)
    expect(data.isSetup).toBe(true)
    expect(data.ghostTips).toContain('Fresh setup generated! 👻')
    expect(data.searchMetadata.query).toBe('office setup (rerolled)')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/build',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'office setup',
          settings: validRerollRequest.settings
        })
      }
    )
  })

  it('should filter out excluded products', async () => {
    const buildResponseWithExcluded = {
      ...mockBuildResponse,
      products: [
        ...mockBuildResponse.products,
        {
          id: 'product-1', // This should be filtered out
          title: 'Excluded Product',
          price: 200,
          currency: 'USD',
          merchant: 'Target',
          rating: 4.0,
          reviewCount: 50,
          imageUrl: 'https://example.com/excluded.jpg',
          productUrl: 'https://example.com/excluded',
          rationale: 'This should be excluded',
          category: 'accessory',
          features: [],
          pros: [],
          cons: [],
          confidence: 0.7,
          searchRank: 3
        }
      ]
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => buildResponseWithExcluded
    } as Response)

    const request = mockRequest(validRerollRequest)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(2) // Should exclude product-1
    expect(data.products.find((p: any) => p.id === 'product-1')).toBeUndefined()
    expect(data.products.find((p: any) => p.id === 'new-product-1')).toBeDefined()
    expect(data.products.find((p: any) => p.id === 'new-product-2')).toBeDefined()
  })

  it('should handle empty exclude list', async () => {
    const requestWithoutExcludes = {
      ...validRerollRequest,
      excludeIds: []
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBuildResponse
    } as Response)

    const request = mockRequest(requestWithoutExcludes)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toEqual(mockBuildResponse.products)
  })

  it('should handle missing excludeIds field', async () => {
    const { excludeIds, ...requestWithoutExcludes } = validRerollRequest

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBuildResponse
    } as Response)

    const request = mockRequest(requestWithoutExcludes)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toEqual(mockBuildResponse.products)
  })

  it('should handle validation errors', async () => {
    const invalidRequest = {
      originalQuery: '', // Invalid empty string
      settings: {
        style: 'Invalid', // Invalid style
        budget: -100, // Invalid negative budget
      }
    }

    const request = mockRequest(invalidRequest)
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should handle build API errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Build API failed' })
    } as Response)

    const request = mockRequest(validRerollRequest)
    const response = await POST(request)

    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.error).toBe(true)
  })

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const request = mockRequest(validRerollRequest)
    const response = await POST(request)

    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.error).toBe(true)
  })

  it('should add reroll-specific ghost tips', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBuildResponse
    } as Response)

    const request = mockRequest(validRerollRequest)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ghostTips).toContain('Fresh setup generated! 👻')
    expect(data.ghostTips).toContain('New products, same great style!')
    expect(data.ghostTips).toContain('Rerolled with your preferences in mind!')
    // Should also include original tips
    expect(data.ghostTips).toContain('Great office setup!')
    expect(data.ghostTips).toContain('Perfect for productivity!')
  })

  it('should modify search metadata query', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBuildResponse
    } as Response)

    const request = mockRequest(validRerollRequest)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.searchMetadata.query).toBe('office setup (rerolled)')
    expect(data.searchMetadata.totalResults).toBe(mockBuildResponse.searchMetadata.totalResults)
    expect(data.searchMetadata.searchTime).toBe(mockBuildResponse.searchMetadata.searchTime)
    expect(data.searchMetadata.region).toBe(mockBuildResponse.searchMetadata.region)
  })
})
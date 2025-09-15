import { NextRequest } from 'next/server'
import { POST } from '../route'
import { searchProducts } from '@/lib/api/serpapi'
import { getCachedData, setCachedData } from '@/lib/cache'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/api/serpapi')
vi.mock('@/lib/cache')

const mockSearchProducts = vi.mocked(searchProducts)
const mockGetCachedData = vi.mocked(getCachedData)
const mockSetCachedData = vi.mocked(setCachedData)

describe('/api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedData.mockResolvedValue(null)
    mockSetCachedData.mockResolvedValue(undefined)
  })

  const validSearchRequest = {
    query: 'office chair',
    region: 'US' as const,
    amazonOnly: false,
    limit: 10
  }

  const mockSearchResponse = {
    products: [
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
    ],
    totalResults: 3,
    searchMetadata: {
      totalResults: 3,
      searchTime: 1500,
      region: 'US',
      query: 'office chair'
    }
  }

  it('should search products successfully', async () => {
    mockSearchProducts.mockResolvedValue(mockSearchResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(validSearchRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(3)
    expect(data.products[0].title).toBe('Ergonomic Office Chair')
    expect(mockSearchProducts).toHaveBeenCalledWith(validSearchRequest)
    expect(mockSetCachedData).toHaveBeenCalled()
  })

  it('should return cached results if available', async () => {
    mockGetCachedData.mockResolvedValue(mockSearchResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(validSearchRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSearchResponse)
    expect(mockSearchProducts).not.toHaveBeenCalled()
    expect(mockGetCachedData).toHaveBeenCalled()
  })

  it('should validate request data', async () => {
    const invalidRequest = {
      query: '', // Invalid: empty query
      region: 'XX', // Invalid region
      amazonOnly: 'not-boolean', // Invalid type
      limit: -5 // Invalid: negative limit
    }

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(invalidRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.type).toBe('VALIDATION_ERROR')
    expect(mockSearchProducts).not.toHaveBeenCalled()
  })

  it('should filter by budget when specified', async () => {
    const requestWithBudget = {
      ...validSearchRequest,
      budget: 300
    }

    mockSearchProducts.mockResolvedValue(mockSearchResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(requestWithBudget)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should filter out the $399.99 chair
    expect(data.products).toHaveLength(2)
    expect(data.products.every((p: any) => p.price <= 300)).toBe(true)
  })

  it('should filter by Amazon only when requested', async () => {
    const amazonOnlyRequest = {
      ...validSearchRequest,
      amazonOnly: true
    }

    mockSearchProducts.mockResolvedValue(mockSearchResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(amazonOnlyRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should only return Amazon products
    expect(data.products).toHaveLength(1)
    expect(data.products[0].merchant).toBe('Amazon')
  })

  it('should respect limit parameter', async () => {
    const limitedRequest = {
      ...validSearchRequest,
      limit: 2
    }

    mockSearchProducts.mockResolvedValue(mockSearchResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(limitedRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(2)
  })

  it('should handle category-specific searches', async () => {
    const categoryRequest = {
      ...validSearchRequest,
      category: 'gaming'
    }

    mockSearchProducts.mockResolvedValue(mockSearchResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(categoryRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockSearchProducts).toHaveBeenCalledWith(categoryRequest)
  })

  it('should handle different regions', async () => {
    const ukRequest = {
      ...validSearchRequest,
      region: 'UK' as const
    }

    const ukResponse = {
      ...mockSearchResponse,
      products: mockSearchResponse.products.map(p => ({
        ...p,
        currency: 'GBP',
        price: p.price * 0.8 // Approximate conversion
      }))
    }

    mockSearchProducts.mockResolvedValue(ukResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(ukRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products[0].currency).toBe('GBP')
    expect(mockSearchProducts).toHaveBeenCalledWith(ukRequest)
  })

  it('should handle SerpAPI errors', async () => {
    mockSearchProducts.mockRejectedValue(new Error('SerpAPI error'))

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(validSearchRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
    expect(mockSearchProducts).toHaveBeenCalledWith(validSearchRequest)
  })

  it('should handle empty search results', async () => {
    const emptyResponse = {
      products: [],
      totalResults: 0,
      searchMetadata: {
        totalResults: 0,
        searchTime: 500,
        region: 'US',
        query: 'nonexistent product'
      }
    }

    mockSearchProducts.mockResolvedValue(emptyResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({
        ...validSearchRequest,
        query: 'nonexistent product'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.products).toHaveLength(0)
    expect(data.totalResults).toBe(0)
  })

  it('should handle combined filters (budget + Amazon only)', async () => {
    const combinedRequest = {
      ...validSearchRequest,
      budget: 300,
      amazonOnly: true
    }

    mockSearchProducts.mockResolvedValue(mockSearchResponse)

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify(combinedRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should return only Amazon products under $300
    expect(data.products).toHaveLength(1)
    expect(data.products[0].merchant).toBe('Amazon')
    expect(data.products[0].price).toBeLessThanOrEqual(300)
  })
})
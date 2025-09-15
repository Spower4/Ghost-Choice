import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SerpAPIClient, createSerpAPIClient, searchProducts } from '../serpapi'
import { SearchRequest } from '@/types/api'
import { ExternalAPIError, RateLimitError } from '@/lib/errors'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock environment variables
const mockEnv = {
  SERPAPI_KEY: 'test-api-key'
}

vi.stubGlobal('process', {
  env: mockEnv
})

describe('SerpAPIClient', () => {
  let client: SerpAPIClient
  
  beforeEach(() => {
    client = new SerpAPIClient('test-api-key')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      expect(() => new SerpAPIClient('valid-key')).not.toThrow()
    })

    it('should throw error with missing API key', () => {
      expect(() => new SerpAPIClient('')).toThrow(ExternalAPIError)
    })
  })

  describe('searchProducts', () => {
    const mockRequest: SearchRequest = {
      query: 'office chair',
      region: 'US',
      amazonOnly: false,
      limit: 10
    }

    const mockSerpAPIResponse = {
      search_metadata: {
        id: 'test-id',
        status: 'Success',
        json_endpoint: 'test-endpoint',
        created_at: '2024-01-01T00:00:00Z',
        processed_at: '2024-01-01T00:00:01Z',
        google_url: 'test-url',
        raw_html_file: 'test-file',
        total_time_taken: 1.5
      },
      search_parameters: {
        engine: 'google_shopping',
        q: 'office chair',
        location_requested: 'United States',
        location_used: 'United States',
        google_domain: 'google.com',
        hl: 'en',
        gl: 'us',
        device: 'desktop'
      },
      search_information: {
        organic_results_state: 'Results for exact spelling',
        query_displayed: 'office chair',
        total_results: 1000
      },
      shopping_results: [
        {
          position: 1,
          title: 'Ergonomic Office Chair',
          link: 'https://amazon.com/chair1',
          price: {
            value: 299.99,
            currency: 'USD',
            raw_value: '$299.99'
          },
          rating: 4.5,
          reviews: 1250,
          thumbnail: 'https://example.com/chair1.jpg',
          source: 'Amazon'
        },
        {
          position: 2,
          title: 'Budget Office Chair',
          link: 'https://walmart.com/chair2',
          price: {
            value: 89.99,
            currency: 'USD',
            raw_value: '$89.99'
          },
          rating: 3.8,
          reviews: 450,
          thumbnail: 'https://example.com/chair2.jpg',
          source: 'Walmart'
        }
      ]
    }

    it('should successfully search for products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSerpAPIResponse)
      })

      const result = await client.searchProducts(mockRequest)

      expect(result.products).toHaveLength(2)
      expect(result.products[0]).toMatchObject({
        title: 'Ergonomic Office Chair',
        price: 299.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1250
      })
      expect(result.totalResults).toBe(1000)
      expect(result.searchMetadata.region).toBe('US')
    })

    it('should handle Amazon-only filter', async () => {
      const amazonRequest = { ...mockRequest, amazonOnly: true }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSerpAPIResponse)
      })

      await client.searchProducts(amazonRequest)

      const fetchCall = mockFetch.mock.calls[0][0]
      expect(fetchCall).toContain('tbs=mr%3A1%2Cmerchagg%3Am100148617')
    })

    it('should handle budget filter', async () => {
      const budgetRequest = { ...mockRequest, budget: 200 }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSerpAPIResponse)
      })

      await client.searchProducts(budgetRequest)

      const fetchCall = mockFetch.mock.calls[0][0]
      expect(fetchCall).toContain('office+chair+under+%24200')
    })

    it('should handle category filter', async () => {
      const categoryRequest = { ...mockRequest, category: 'furniture' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSerpAPIResponse)
      })

      await client.searchProducts(categoryRequest)

      const fetchCall = mockFetch.mock.calls[0][0]
      expect(fetchCall).toContain('furniture+office+chair')
    })

    it('should handle different regions', async () => {
      const ukRequest = { ...mockRequest, region: 'UK' as const }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockSerpAPIResponse,
          shopping_results: [{
            ...mockSerpAPIResponse.shopping_results[0],
            price: { value: 249.99, currency: 'GBP', raw_value: '£249.99' }
          }]
        })
      })

      const result = await client.searchProducts(ukRequest)

      expect(result.products[0].currency).toBe('GBP')
      const fetchCall = mockFetch.mock.calls[0][0]
      expect(fetchCall).toContain('gl=uk')
      expect(fetchCall).toContain('google_domain=google.co.uk')
    })

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockSerpAPIResponse,
          search_information: {
            ...mockSerpAPIResponse.search_information,
            total_results: 0
          },
          shopping_results: []
        })
      })

      const result = await client.searchProducts(mockRequest)

      expect(result.products).toHaveLength(0)
      expect(result.totalResults).toBe(0)
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockSerpAPIResponse,
          error: 'Invalid API key'
        })
      })

      await expect(client.searchProducts(mockRequest)).rejects.toThrow(ExternalAPIError)
    })

    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({})
      })

      await expect(client.searchProducts(mockRequest)).rejects.toThrow()
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(client.searchProducts(mockRequest)).rejects.toThrow(ExternalAPIError)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(client.searchProducts(mockRequest)).rejects.toThrow()
    })

    it('should filter products with invalid data', async () => {
      const invalidResponse = {
        ...mockSerpAPIResponse,
        shopping_results: [
          mockSerpAPIResponse.shopping_results[0], // Valid product
          {
            position: 2,
            title: 'Invalid Product',
            link: 'https://example.com/invalid',
            // Missing price
            rating: 4.0,
            reviews: 100
          },
          {
            position: 3,
            title: '', // Empty title
            link: 'https://example.com/empty',
            price: { value: 50, currency: 'USD', raw_value: '$50' }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse)
      })

      const result = await client.searchProducts(mockRequest)

      expect(result.products).toHaveLength(1) // Only valid product
      expect(result.products[0].title).toBe('Ergonomic Office Chair')
    })

    it('should parse products when product_id is missing but link/title present', async () => {
      // Mock SerpAPI response with shopping_results that have missing product_id
      const mockResponseWithMissingIds = {
        ...mockSerpAPIResponse,
        shopping_results: [
          {
            position: 1,
            title: 'Gaming Chair Pro',
            link: 'https://example.com/chair1',
            price: '$299.99',
            extracted_price: 299.99,
            currency: 'USD',
            rating: 4.5,
            reviews: 150,
            thumbnail: 'https://example.com/thumb1.jpg',
            source: 'Amazon'
            // Note: no product_id field
          },
          {
            position: 2,
            title: 'Ergonomic Gaming Chair',
            link: 'https://example.com/chair2',
            // Note: no extracted_price, only price string
            price: '$199.99',
            currency: 'USD',
            rating: 4.2,
            reviews: 89,
            thumbnail: 'https://example.com/thumb2.jpg',
            source: 'Best Buy'
            // Note: no product_id field
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponseWithMissingIds)
      })

      const result = await client.searchProducts(mockRequest)

      // Should parse >0 products even without product_id
      expect(result.products.length).toBeGreaterThan(0)
      expect(result.products).toHaveLength(2)
      
      // Check first product
      expect(result.products[0]).toMatchObject({
        id: '1', // Should use position as fallback ID
        title: 'Gaming Chair Pro',
        price: 299.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 150
      })
      
      // Check second product (price parsed from string)
      expect(result.products[1]).toMatchObject({
        id: '2', // Should use position as fallback ID
        title: 'Ergonomic Gaming Chair',
        price: 199.99, // Should be parsed from price string
        currency: 'USD',
        merchant: 'Best Buy',
        rating: 4.2,
        reviewCount: 89
      })
    })
  })

  describe('merchant extraction', () => {
    it('should extract merchant from source', () => {
      const client = new SerpAPIClient('test-key')
      // Access private method for testing
      const extractMerchant = (client as any).extractMerchant.bind(client)
      
      expect(extractMerchant('Amazon', 'https://amazon.com/product')).toBe('Amazon')
      expect(extractMerchant('Walmart', 'https://walmart.com/product')).toBe('Walmart')
    })

    it('should extract merchant from URL when source is missing', () => {
      const client = new SerpAPIClient('test-key')
      const extractMerchant = (client as any).extractMerchant.bind(client)
      
      expect(extractMerchant(undefined, 'https://amazon.com/product')).toBe('Amazon')
      expect(extractMerchant(undefined, 'https://www.bestbuy.com/product')).toBe('Best Buy')
      expect(extractMerchant(undefined, 'https://target.com/product')).toBe('Target')
      expect(extractMerchant(undefined, 'https://unknown-store.com/product')).toBe('Unknown-store')
    })

    it('should return Unknown for invalid URLs', () => {
      const client = new SerpAPIClient('test-key')
      const extractMerchant = (client as any).extractMerchant.bind(client)
      
      expect(extractMerchant(undefined, 'invalid-url')).toBe('Unknown')
      expect(extractMerchant(undefined, undefined)).toBe('Unknown')
    })
  })

  describe('filtering and sorting', () => {
    const mockProducts = [
      {
        id: '1',
        title: 'Product 1',
        url: 'https://example.com/1',
        price: 100,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1000,
        image: 'https://example.com/1.jpg'
      },
      {
        id: '2',
        title: 'Product 2',
        url: 'https://example.com/2',
        price: 200,
        currency: 'USD',
        merchant: 'Walmart',
        rating: 3.8,
        reviewCount: 500,
        image: 'https://example.com/2.jpg'
      },
      {
        id: '3',
        title: 'Product 3',
        url: 'https://example.com/3',
        price: 150,
        currency: 'USD',
        merchant: 'Target',
        rating: 4.2,
        reviewCount: 750,
        image: 'https://example.com/3.jpg'
      }
    ]

    it('should filter by merchant', () => {
      const filtered = client.filterByMerchant(mockProducts, ['Amazon', 'Target'])
      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.merchant)).toEqual(['Amazon', 'Target'])
    })

    it('should filter by price range', () => {
      const filtered = client.filterByPriceRange(mockProducts, 120, 180)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].price).toBe(150)
    })

    it('should sort by price', () => {
      const sorted = client.sortProducts(mockProducts, 'price')
      expect(sorted.map(p => p.price)).toEqual([100, 150, 200])
    })

    it('should sort by rating', () => {
      const sorted = client.sortProducts(mockProducts, 'rating')
      expect(sorted.map(p => p.rating)).toEqual([4.5, 4.2, 3.8])
    })

    it('should sort by reviews', () => {
      const sorted = client.sortProducts(mockProducts, 'reviews')
      expect(sorted.map(p => p.reviewCount)).toEqual([1000, 750, 500])
    })
  })
})

describe('Factory functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSerpAPIClient', () => {
    it('should create client with environment API key', () => {
      mockEnv.SERPAPI_KEY = 'test-api-key'
      expect(() => createSerpAPIClient()).not.toThrow()
    })

    it('should throw error when API key is missing', () => {
      mockEnv.SERPAPI_KEY = ''
      expect(() => createSerpAPIClient()).toThrow(ExternalAPIError)
    })
  })

  describe('searchProducts', () => {
    it('should use factory function to search products', async () => {
      mockEnv.SERPAPI_KEY = 'test-api-key'
      
      const mockRequest: SearchRequest = {
        query: 'test product',
        region: 'US',
        amazonOnly: false,
        limit: 5
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          search_metadata: { total_time_taken: 1.0 },
          search_parameters: { q: 'test product' },
          search_information: { total_results: 0 },
          shopping_results: []
        })
      })

      const result = await searchProducts(mockRequest)
      expect(result.products).toHaveLength(0)
    })
  })
})
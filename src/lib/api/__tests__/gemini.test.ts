import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiAIClient, createGeminiAIClient, generatePlan, rankProducts, generateGhostTips } from '../gemini'
import { PlanRequest, RankRequest, RawProduct } from '@/types/api'
import { Product } from '@/types'
import { ExternalAPIError, RateLimitError } from '@/lib/errors'

// Mock Google Generative AI
const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}))

// Mock environment variables
const mockEnv = {
  GEMINI_API_KEY: 'test-api-key'
}

vi.stubGlobal('process', {
  env: mockEnv
})

describe('GeminiAIClient', () => {
  let client: GeminiAIClient
  
  beforeEach(() => {
    client = new GeminiAIClient('test-api-key')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      expect(() => new GeminiAIClient('valid-key')).not.toThrow()
    })

    it('should throw error with missing API key', () => {
      expect(() => new GeminiAIClient('')).toThrow(ExternalAPIError)
    })
  })

  describe('generatePlan', () => {
    const mockRequest: PlanRequest = {
      query: 'office setup',
      budget: 1000,
      style: 'Premium',
      region: 'US'
    }

    const mockAIResponse = `\`\`\`json
{
  "approach": "setup",
  "categories": [
    {
      "category": "Desk",
      "priority": 1,
      "budgetAllocation": 400,
      "searchTerms": ["office desk", "standing desk"],
      "requirements": ["Ergonomic", "Spacious"]
    },
    {
      "category": "Chair",
      "priority": 2,
      "budgetAllocation": 300,
      "searchTerms": ["office chair", "ergonomic chair"],
      "requirements": ["Lumbar support", "Adjustable"]
    },
    {
      "category": "Monitor",
      "priority": 3,
      "budgetAllocation": 300,
      "searchTerms": ["computer monitor", "4K monitor"],
      "requirements": ["High resolution", "Eye-friendly"]
    }
  ],
  "budgetDistribution": [
    {
      "category": "Desk",
      "amount": 400,
      "percentage": 40,
      "color": "#FF6B6B"
    },
    {
      "category": "Chair",
      "amount": 300,
      "percentage": 30,
      "color": "#4ECDC4"
    },
    {
      "category": "Monitor",
      "amount": 300,
      "percentage": 30,
      "color": "#45B7D1"
    }
  ],
  "totalItems": 3
}
\`\`\``

    it('should successfully generate a setup plan', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => mockAIResponse
        }
      })

      const result = await client.generatePlan(mockRequest)

      expect(result.searchStrategy.approach).toBe('setup')
      expect(result.categories).toHaveLength(3)
      expect(result.categories[0]).toMatchObject({
        category: 'Desk',
        priority: 1,
        budgetAllocation: 400
      })
      expect(result.budgetDistribution).toHaveLength(3)
      expect(result.budgetDistribution[0].amount).toBe(400)
    })

    it('should handle single item queries', async () => {
      const singleItemRequest = { ...mockRequest, query: 'office chair' }
      const singleItemResponse = mockAIResponse.replace('"setup"', '"single"')

      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => singleItemResponse
        }
      })

      const result = await client.generatePlan(singleItemRequest)

      expect(result.searchStrategy.approach).toBe('single')
    })

    it('should use fallback plan when AI response is invalid', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Invalid JSON response'
        }
      })

      const result = await client.generatePlan(mockRequest)

      expect(result.categories).toBeDefined()
      expect(result.budgetDistribution).toBeDefined()
      expect(result.searchStrategy).toBeDefined()
    })

    it('should handle AI API errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API Error'))

      await expect(client.generatePlan(mockRequest)).rejects.toThrow()
    })

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      ;(rateLimitError as any).status = 429
      mockGenerateContent.mockRejectedValueOnce(rateLimitError)

      await expect(client.generatePlan(mockRequest)).rejects.toThrow()
    })
  })

  describe('rankProducts', () => {
    const mockProducts: RawProduct[] = [
      {
        id: '1',
        title: 'Premium Office Chair',
        price: 299.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1250,
        imageUrl: 'https://example.com/chair1.jpg',
        productUrl: 'https://example.com/chair1'
      },
      {
        id: '2',
        title: 'Budget Office Chair',
        price: 89.99,
        currency: 'USD',
        merchant: 'Walmart',
        rating: 3.8,
        reviewCount: 450,
        imageUrl: 'https://example.com/chair2.jpg',
        productUrl: 'https://example.com/chair2'
      }
    ]

    const mockRankRequest: RankRequest = {
      products: mockProducts,
      criteria: {
        priceWeight: 0.3,
        ratingWeight: 0.4,
        reviewWeight: 0.2,
        relevanceWeight: 0.1
      },
      userPreferences: {
        style: 'Premium',
        budget: 500,
        prioritizeRating: true
      }
    }

    const mockRankingResponse = `\`\`\`json
{
  "rankings": [
    {
      "productIndex": 0,
      "score": 0.85,
      "rationale": "Excellent rating and premium quality",
      "pros": ["High rating", "Many reviews", "Premium brand"],
      "cons": ["Higher price"],
      "confidence": 0.9
    },
    {
      "productIndex": 1,
      "score": 0.65,
      "rationale": "Good value for money",
      "pros": ["Affordable", "Decent rating"],
      "cons": ["Lower rating", "Fewer reviews"],
      "confidence": 0.7
    }
  ],
  "reasoning": ["Ranked based on rating quality and user preferences", "Premium style preference favors higher-end products"]
}
\`\`\``

    it('should successfully rank products', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => mockRankingResponse
        }
      })

      const result = await client.rankProducts(mockRankRequest)

      expect(result.rankedProducts).toHaveLength(2)
      expect(result.rankedProducts[0].title).toBe('Premium Office Chair')
      expect(result.rankedProducts[0].rationale).toContain('Excellent rating')
      expect(result.reasoning).toHaveLength(2)
    })

    it('should use heuristic ranking as fallback', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('AI Error'))

      const result = await client.rankProducts(mockRankRequest)

      expect(result.rankedProducts).toHaveLength(2)
      expect(result.reasoning[0]).toContain('heuristic algorithm')
    })

    it('should handle invalid AI ranking response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Invalid ranking response'
        }
      })

      const result = await client.rankProducts(mockRankRequest)

      expect(result.rankedProducts).toHaveLength(2)
      expect(result.reasoning[0]).toContain('heuristic algorithm')
    })
  })

  describe('generateGhostTips', () => {
    const mockProducts: Product[] = [
      {
        id: '1',
        title: 'Office Chair',
        price: 299.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1250,
        imageUrl: 'https://example.com/chair.jpg',
        productUrl: 'https://example.com/chair',
        rationale: 'Great chair',
        category: 'Furniture',
        features: [],
        pros: [],
        cons: [],
        confidence: 0.9,
        searchRank: 1
      }
    ]

    const mockTipsResponse = `\`\`\`json
["Chairs with lumbar support are trending today 👻", "Pro tip: Check return policies for furniture", "Users love products with 4.5+ stars"]
\`\`\``

    it('should generate ghost tips successfully', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => mockTipsResponse
        }
      })

      const result = await client.generateGhostTips('office chair', mockProducts)

      expect(result).toHaveLength(3)
      expect(result[0]).toContain('lumbar support')
      expect(result[1]).toContain('return policies')
    })

    it('should use fallback tips when AI fails', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('AI Error'))

      const result = await client.generateGhostTips('office chair', mockProducts)

      expect(result).toHaveLength(3)
      expect(result[0]).toContain('office chair')
    })

    it('should handle invalid tips response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Invalid tips response'
        }
      })

      const result = await client.generateGhostTips('office chair', mockProducts)

      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('heuristic ranking', () => {
    const mockProducts: RawProduct[] = [
      {
        id: '1',
        title: 'High Rating Product',
        price: 100,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.8,
        reviewCount: 2000,
        imageUrl: 'https://example.com/1.jpg',
        productUrl: 'https://example.com/1'
      },
      {
        id: '2',
        title: 'Low Rating Product',
        price: 50,
        currency: 'USD',
        merchant: 'Walmart',
        rating: 3.2,
        reviewCount: 100,
        imageUrl: 'https://example.com/2.jpg',
        productUrl: 'https://example.com/2'
      }
    ]

    it('should rank products using heuristic algorithm', async () => {
      const request: RankRequest = {
        products: mockProducts,
        criteria: {
          priceWeight: 0.2,
          ratingWeight: 0.5,
          reviewWeight: 0.2,
          relevanceWeight: 0.1
        },
        userPreferences: {
          style: 'Premium',
          budget: 200,
          prioritizeRating: true
        }
      }

      // Force heuristic ranking by making AI fail
      mockGenerateContent.mockRejectedValueOnce(new Error('AI Error'))

      const result = await client.rankProducts(request)

      expect(result.rankedProducts).toHaveLength(2)
      // High rating product should be ranked first due to rating weight
      expect(result.rankedProducts[0].rating).toBe(4.8)
      expect(result.rankedProducts[0].pros).toContain('Excellent rating')
    })
  })

  describe('utility methods', () => {
    it('should validate color codes', () => {
      const client = new GeminiAIClient('test-key')
      const validateColor = (client as any).validateColor.bind(client)
      
      expect(validateColor('#FF6B6B')).toBe('#FF6B6B')
      expect(validateColor('#ff6b6b')).toBe('#FF6B6B')
      expect(validateColor('invalid')).toMatch(/^#[0-9A-F]{6}$/)
      expect(validateColor('')).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should detect setup queries', () => {
      const client = new GeminiAIClient('test-key')
      const isSetupQuery = (client as any).isSetupQuery.bind(client)
      
      expect(isSetupQuery('office setup')).toBe(true)
      expect(isSetupQuery('gaming room')).toBe(true)
      expect(isSetupQuery('bedroom furniture')).toBe(true)
      expect(isSetupQuery('chair')).toBe(false)
      expect(isSetupQuery('monitor')).toBe(false)
    })

    it('should calculate price scores correctly', () => {
      const client = new GeminiAIClient('test-key')
      const calculatePriceScore = (client as any).calculatePriceScore.bind(client)
      
      expect(calculatePriceScore(100, 1000)).toBeGreaterThan(0.5) // Good value
      expect(calculatePriceScore(1100, 1000)).toBe(0) // Over budget
      expect(calculatePriceScore(50, 1000)).toBe(0.3) // Too cheap
    })
  })
  describe('error handling', () => {
    it('should detect rate limit from message without status', async () => {
      const client = new GeminiAIClient('test-key')
      const generateContent = (client as any).generateContent.bind(client)
      
      // Mock model.generateContent to throw error with rate limit message
      ;(client as any).model = {
        generateContent: vi.fn().mockRejectedValue({
          message: 'Rate limit exceeded'
        })
      }

      await expect(generateContent('test prompt')).rejects.toThrow('RateLimitError')
    })

    it('should handle heuristic ranking with missing data without NaN', () => {
      const client = new GeminiAIClient('test-key')
      const heuristicRanking = (client as any).heuristicRanking.bind(client)
      
      const request: RankRequest = {
        products: [
          {
            id: '1',
            title: 'Product 1',
            url: 'https://example.com/1',
            // Missing price, rating, reviewCount
          },
          {
            id: '2', 
            title: 'Product 2',
            url: 'https://example.com/2',
            price: undefined,
            rating: undefined,
            reviewCount: undefined
          }
        ],
        criteria: {
          priceWeight: 0.25,
          ratingWeight: 0.25,
          reviewWeight: 0.25,
          relevanceWeight: 0.25
        },
        userPreferences: {
          style: 'Premium',
          budget: 1000,
          prioritizeRating: true
        }
      }

      const result = heuristicRanking(request)
      
      expect(result.rankedProducts).toHaveLength(2)
      expect(result.rankedProducts.every(p => Number.isFinite(p.price))).toBe(true)
      expect(result.rankedProducts.every(p => Number.isFinite(p.rating))).toBe(true)
      expect(result.rankedProducts.every(p => Number.isFinite(p.reviewCount))).toBe(true)
      expect(result.rankedProducts.every(p => p.searchRank > 0)).toBe(true)
    })
  })
})

describe('Factory functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createGeminiAIClient', () => {
    it('should create client with environment API key', () => {
      mockEnv.GEMINI_API_KEY = 'test-api-key'
      expect(() => createGeminiAIClient()).not.toThrow()
    })

    it('should throw error when API key is missing', () => {
      mockEnv.GEMINI_API_KEY = ''
      expect(() => createGeminiAIClient()).toThrow(ExternalAPIError)
    })
  })

  describe('convenience functions', () => {
    beforeEach(() => {
      mockEnv.GEMINI_API_KEY = 'test-api-key'
    })

    it('should use factory function for generatePlan', async () => {
      const mockRequest: PlanRequest = {
        query: 'test setup',
        budget: 500,
        style: 'Casual',
        region: 'US'
      }

      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Invalid response' // Will trigger fallback
        }
      })

      const result = await generatePlan(mockRequest)
      expect(result.categories).toBeDefined()
    })

    it('should use factory function for rankProducts', async () => {
      const mockRequest: RankRequest = {
        products: [],
        criteria: {
          priceWeight: 0.25,
          ratingWeight: 0.25,
          reviewWeight: 0.25,
          relevanceWeight: 0.25
        },
        userPreferences: {
          style: 'Casual',
          budget: 100,
          prioritizeRating: false
        }
      }

      mockGenerateContent.mockRejectedValueOnce(new Error('AI Error'))

      const result = await rankProducts(mockRequest)
      expect(result.rankedProducts).toEqual([])
      expect(result.reasoning).toBeDefined()
    })

    it('should use factory function for generateGhostTips', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('AI Error'))

      const result = await generateGhostTips('test query', [])
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
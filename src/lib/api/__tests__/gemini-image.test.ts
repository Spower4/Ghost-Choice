import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  GeminiImageClient, 
  createGeminiImageClient, 
  generateScene, 
  generateSceneVariations,
  getAvailableSceneStyles,
  SCENE_STYLES 
} from '../gemini-image'
import { SceneRequest } from '@/types/api'
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

describe('GeminiImageClient', () => {
  let client: GeminiImageClient
  
  const mockProducts: Product[] = [
    {
      id: '1',
      title: 'Ergonomic Office Chair',
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
    },
    {
      id: '2',
      title: 'Standing Desk',
      price: 599.99,
      currency: 'USD',
      merchant: 'Wayfair',
      rating: 4.3,
      reviewCount: 800,
      imageUrl: 'https://example.com/desk.jpg',
      productUrl: 'https://example.com/desk',
      rationale: 'Excellent desk',
      category: 'Furniture',
      features: [],
      pros: [],
      cons: [],
      confidence: 0.8,
      searchRank: 2
    }
  ]

  beforeEach(() => {
    client = new GeminiImageClient('test-api-key')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      expect(() => new GeminiImageClient('valid-key')).not.toThrow()
    })

    it('should throw error with missing API key', () => {
      expect(() => new GeminiImageClient('')).toThrow(ExternalAPIError)
    })
  })

  describe('generateScene', () => {
    const mockRequest: SceneRequest = {
      products: mockProducts,
      style: 'Modern',
      roomType: 'office'
    }

    it('should successfully generate a scene', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Generated scene description'
        }
      })

      const result = await client.generateScene(mockRequest)

      expect(result.style).toBe('Modern')
      expect(result.imageUrl).toMatch(/^https:\/\/picsum\.photos\/seed\//)
      expect(result.prompt).toContain('modern style office scene')
      expect(result.prompt).toContain('Ergonomic Office Chair')
      expect(result.prompt).toContain('Standing Desk')
    })

    it('should handle different scene styles', async () => {
      const styles: Array<'Cozy' | 'Minimal' | 'Gaming' | 'Modern'> = ['Cozy', 'Minimal', 'Gaming', 'Modern']
      
      for (const style of styles) {
        mockGenerateContent.mockResolvedValueOnce({
          response: {
            text: () => `Generated ${style} scene`
          }
        })

        const request = { ...mockRequest, style }
        const result = await client.generateScene(request)

        expect(result.style).toBe(style)
        expect(result.prompt).toContain(style.toLowerCase())
      }
    })

    it('should infer room type from products', async () => {
      const gamingProducts: Product[] = [
        {
          ...mockProducts[0],
          title: 'Gaming Chair RGB',
          category: 'Gaming'
        },
        {
          ...mockProducts[1],
          title: 'Gaming Desk with LED',
          category: 'Gaming'
        }
      ]

      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Generated gaming scene'
        }
      })

      const request: SceneRequest = {
        products: gamingProducts,
        style: 'Gaming'
      }

      const result = await client.generateScene(request)
      expect(result.prompt).toContain('gaming room')
    })

    it('should handle API errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API Error'))

      await expect(client.generateScene(mockRequest)).rejects.toThrow()
    })

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      ;(rateLimitError as any).status = 429
      mockGenerateContent.mockRejectedValueOnce(rateLimitError)

      await expect(client.generateScene(mockRequest)).rejects.toThrow()
    })

    it('should handle server errors', async () => {
      const serverError = new Error('Server error')
      ;(serverError as any).status = 500
      mockGenerateContent.mockRejectedValueOnce(serverError)

      await expect(client.generateScene(mockRequest)).rejects.toThrow(ExternalAPIError)
    })
  })

  describe('generateSceneVariations', () => {
    const mockRequest: SceneRequest = {
      products: mockProducts,
      style: 'Modern'
    }

    it('should generate multiple scene variations', async () => {
      // Mock multiple successful responses
      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Variation 1' }
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Variation 2' }
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Variation 3' }
        })

      const results = await client.generateSceneVariations(mockRequest, 3)

      expect(results).toHaveLength(3)
      expect(results[0].style).toBe('Modern')
      expect(results[1].style).toBe('Modern')
      expect(results[2].style).toBe('Modern')
      
      // Each variation should have different prompts
      expect(results[0].prompt).toContain('Variation 1')
      expect(results[1].prompt).toContain('Variation 2')
      expect(results[2].prompt).toContain('Variation 3')
    })

    it('should handle partial failures in variations', async () => {
      // Mock one success and one failure
      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Variation 1' }
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          response: { text: () => 'Variation 3' }
        })

      const results = await client.generateSceneVariations(mockRequest, 3)

      expect(results).toHaveLength(2) // Only successful variations
    })

    it('should throw error if all variations fail', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'))

      await expect(client.generateSceneVariations(mockRequest, 2)).rejects.toThrow(ExternalAPIError)
    })
  })

  describe('validation', () => {
    it('should validate scene requests', () => {
      // Valid request
      expect(() => client.validateSceneRequest({
        products: mockProducts,
        style: 'Modern'
      })).not.toThrow()

      // Empty products
      expect(() => client.validateSceneRequest({
        products: [],
        style: 'Modern'
      })).toThrow(ExternalAPIError)

      // Too many products
      const tooManyProducts = Array(15).fill(mockProducts[0])
      expect(() => client.validateSceneRequest({
        products: tooManyProducts,
        style: 'Modern'
      })).toThrow(ExternalAPIError)

      // Invalid style
      expect(() => client.validateSceneRequest({
        products: mockProducts,
        style: 'InvalidStyle' as any
      })).toThrow(ExternalAPIError)
    })
  })

  describe('utility methods', () => {
    it('should infer categories from product titles', () => {
      const client = new GeminiImageClient('test-key')
      const inferCategory = (client as any).inferCategoryFromTitle.bind(client)
      
      expect(inferCategory('Ergonomic Office Chair')).toBe('Chair')
      expect(inferCategory('Standing Desk Pro')).toBe('Desk')
      expect(inferCategory('4K Gaming Monitor')).toBe('Monitor')
      expect(inferCategory('Mechanical Keyboard')).toBe('Keyboard')
      expect(inferCategory('Wireless Mouse')).toBe('Mouse')
      expect(inferCategory('LED Lamp')).toBe('Lighting')
      expect(inferCategory('Unknown Product')).toBe('Product')
    })

    it('should infer room types from products', () => {
      const client = new GeminiImageClient('test-key')
      const inferRoomType = (client as any).inferRoomType.bind(client)
      
      const officeProducts = [
        { title: 'Office Chair' },
        { title: 'Standing Desk' }
      ]
      expect(inferRoomType(officeProducts)).toBe('office')

      const gamingProducts = [
        { title: 'Gaming Chair RGB' },
        { title: 'Gaming Monitor' }
      ]
      expect(inferRoomType(gamingProducts)).toBe('gaming room')

      const bedroomProducts = [
        { title: 'Bedroom Nightstand' },
        { title: 'Bed Frame' }
      ]
      expect(inferRoomType(bedroomProducts)).toBe('bedroom')

      const genericProducts = [
        { title: 'Random Product' }
      ]
      expect(inferRoomType(genericProducts)).toBe('room')
    })

    it('should generate consistent placeholder URLs', () => {
      const client = new GeminiImageClient('test-key')
      const generatePlaceholder = (client as any).generatePlaceholderImageUrl.bind(client)
      
      const prompt1 = 'Modern office scene'
      const prompt2 = 'Modern office scene'
      const prompt3 = 'Gaming room scene'
      
      const url1 = generatePlaceholder(prompt1)
      const url2 = generatePlaceholder(prompt2)
      const url3 = generatePlaceholder(prompt3)
      
      expect(url1).toBe(url2) // Same prompt should generate same URL
      expect(url1).not.toBe(url3) // Different prompts should generate different URLs
      expect(url1).toMatch(/^https:\/\/picsum\.photos\/seed\//)
    })

    it('should estimate generation time correctly', () => {
      const time1 = client.estimateGenerationTime(1, 1)
      const time2 = client.estimateGenerationTime(3, 1)
      const time3 = client.estimateGenerationTime(3, 3)
      
      expect(time2).toBeGreaterThan(time1) // More products = more time
      expect(time3).toBeGreaterThan(time2) // More variations = more time
    })

    it('should return available styles', () => {
      const styles = client.getAvailableStyles()
      
      expect(styles).toHaveLength(4)
      expect(styles.map(s => s.style)).toEqual(['Cozy', 'Minimal', 'Gaming', 'Modern'])
      expect(styles[0]).toHaveProperty('description')
    })
  })

  describe('scene styles', () => {
    it('should have all required scene styles', () => {
      expect(SCENE_STYLES).toHaveProperty('Cozy')
      expect(SCENE_STYLES).toHaveProperty('Minimal')
      expect(SCENE_STYLES).toHaveProperty('Gaming')
      expect(SCENE_STYLES).toHaveProperty('Modern')
      
      // Each style should have required properties
      Object.values(SCENE_STYLES).forEach(style => {
        expect(style).toHaveProperty('description')
        expect(style).toHaveProperty('colors')
        expect(style).toHaveProperty('lighting')
        expect(style).toHaveProperty('materials')
      })
    })
  })
})

describe('Factory functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createGeminiImageClient', () => {
    it('should create client with environment API key', () => {
      mockEnv.GEMINI_API_KEY = 'test-api-key'
      expect(() => createGeminiImageClient()).not.toThrow()
    })

    it('should throw error when API key is missing', () => {
      mockEnv.GEMINI_API_KEY = ''
      expect(() => createGeminiImageClient()).toThrow(ExternalAPIError)
    })
  })

  describe('convenience functions', () => {
    beforeEach(() => {
      mockEnv.GEMINI_API_KEY = 'test-api-key'
    })

    const mockRequest: SceneRequest = {
      products: [
        {
          id: '1',
          title: 'Test Product',
          price: 100,
          currency: 'USD',
          merchant: 'Test',
          rating: 4.0,
          reviewCount: 100,
          imageUrl: 'https://example.com/test.jpg',
          productUrl: 'https://example.com/test',
          rationale: 'Test product',
          category: 'Test',
          features: [],
          pros: [],
          cons: [],
          confidence: 0.8,
          searchRank: 1
        }
      ],
      style: 'Modern'
    }

    it('should use factory function for generateScene', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => 'Generated scene' }
      })

      const result = await generateScene(mockRequest)
      expect(result.style).toBe('Modern')
    })

    it('should use factory function for generateSceneVariations', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Variation 1' }
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Variation 2' }
        })

      const results = await generateSceneVariations(mockRequest, 2)
      expect(results).toHaveLength(2)
    })

    it('should validate requests in convenience functions', async () => {
      const invalidRequest: SceneRequest = {
        products: [],
        style: 'Modern'
      }

      await expect(generateScene(invalidRequest)).rejects.toThrow(ExternalAPIError)
      await expect(generateSceneVariations(invalidRequest)).rejects.toThrow(ExternalAPIError)
    })

    it('should return available scene styles', () => {
      const styles = getAvailableSceneStyles()
      expect(styles).toHaveLength(4)
      expect(styles[0]).toHaveProperty('style')
      expect(styles[0]).toHaveProperty('description')
    })
  })
})
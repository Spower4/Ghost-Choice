import { NextRequest } from 'next/server'
import { POST } from '../route'
import { generateScene, generateSceneVariations } from '@/lib/api/gemini-image'
import { getCachedData, setCachedData } from '@/lib/cache'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/api/gemini-image')
vi.mock('@/lib/cache')

const mockGenerateScene = vi.mocked(generateScene)
const mockGenerateSceneVariations = vi.mocked(generateSceneVariations)
const mockGetCachedData = vi.mocked(getCachedData)
const mockSetCachedData = vi.mocked(setCachedData)

describe('/api/ai-scene', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedData.mockResolvedValue(null)
    mockSetCachedData.mockResolvedValue(undefined)
  })

  const mockProducts = [
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
    },
    {
      id: 'chair1',
      title: 'Ergonomic Office Chair',
      price: 299.99,
      currency: 'USD',
      merchant: 'Amazon',
      rating: 4.3,
      reviewCount: 850,
      imageUrl: 'https://example.com/chair1.jpg',
      productUrl: 'https://amazon.com/chair1',
      rationale: 'Comfortable office chair',
      category: 'Chair',
      features: [],
      pros: ['Lumbar support'],
      cons: [],
      confidence: 0.8,
      searchRank: 2
    }
  ]

  const validSceneRequest = {
    products: mockProducts,
    style: 'Modern' as const,
    roomType: 'office'
  }

  const mockSceneResponse = {
    imageUrl: 'https://example.com/generated-scene.jpg',
    prompt: 'Create a photorealistic modern style office scene...',
    style: 'Modern'
  }

  const mockSceneVariations = [
    {
      imageUrl: 'https://example.com/scene-1.jpg',
      prompt: 'Create a photorealistic modern style office scene... Variation 1',
      style: 'Modern'
    },
    {
      imageUrl: 'https://example.com/scene-2.jpg',
      prompt: 'Create a photorealistic modern style office scene... Variation 2',
      style: 'Modern'
    },
    {
      imageUrl: 'https://example.com/scene-3.jpg',
      prompt: 'Create a photorealistic modern style office scene... Variation 3',
      style: 'Modern'
    }
  ]

  it('should generate single scene successfully', async () => {
    mockGenerateScene.mockResolvedValue(mockSceneResponse)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(validSceneRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.scenes).toHaveLength(1)
    expect(data.scenes[0]).toEqual(mockSceneResponse)
    expect(data.count).toBe(1)
    expect(data.style).toBe('Modern')
    expect(data.productCount).toBe(2)
    expect(data.metadata).toBeDefined()
    expect(data.metadata.generatedAt).toBeDefined()
    expect(data.metadata.estimatedGenerationTime).toBeGreaterThan(0)
    
    expect(mockGenerateScene).toHaveBeenCalledWith(validSceneRequest)
    expect(mockSetCachedData).toHaveBeenCalled()
  })

  it('should generate multiple scene variations', async () => {
    mockGenerateSceneVariations.mockResolvedValue(mockSceneVariations)

    const request = new NextRequest('http://localhost:3000/api/ai-scene?variations=3', {
      method: 'POST',
      body: JSON.stringify(validSceneRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.scenes).toHaveLength(3)
    expect(data.scenes).toEqual(mockSceneVariations)
    expect(data.count).toBe(3)
    expect(data.style).toBe('Modern')
    
    expect(mockGenerateSceneVariations).toHaveBeenCalledWith(validSceneRequest, 3)
    expect(mockGenerateScene).not.toHaveBeenCalled()
  })

  it('should return cached scene if available', async () => {
    const cachedScene = {
      scenes: [mockSceneResponse],
      count: 1,
      style: 'Modern',
      productCount: 2,
      metadata: {
        generatedAt: '2024-01-01T00:00:00.000Z',
        style: 'Modern',
        roomType: 'office',
        productTitles: ['Standing Desk Pro', 'Ergonomic Office Chair'],
        estimatedGenerationTime: 40
      }
    }

    mockGetCachedData.mockResolvedValue(cachedScene)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(validSceneRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(cachedScene)
    expect(mockGenerateScene).not.toHaveBeenCalled()
    expect(mockGetCachedData).toHaveBeenCalled()
  })

  it('should validate request data', async () => {
    const invalidRequest = {
      products: [], // Invalid: empty products array
      style: 'Invalid', // Invalid style
      roomType: 123 // Invalid type
    }

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(invalidRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.type).toBe('VALIDATION_ERROR')
    expect(mockGenerateScene).not.toHaveBeenCalled()
  })

  it('should handle different scene styles', async () => {
    const cozyRequest = {
      ...validSceneRequest,
      style: 'Cozy' as const
    }

    const cozyResponse = {
      ...mockSceneResponse,
      style: 'Cozy'
    }

    mockGenerateScene.mockResolvedValue(cozyResponse)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(cozyRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.style).toBe('Cozy')
    expect(mockGenerateScene).toHaveBeenCalledWith(cozyRequest)
  })

  it('should handle gaming style scenes', async () => {
    const gamingRequest = {
      products: [
        {
          ...mockProducts[0],
          title: 'Gaming Desk RGB',
          category: 'Gaming Desk'
        },
        {
          ...mockProducts[1],
          title: 'Gaming Chair Pro',
          category: 'Gaming Chair'
        }
      ],
      style: 'Gaming' as const,
      roomType: 'gaming room'
    }

    const gamingResponse = {
      ...mockSceneResponse,
      style: 'Gaming'
    }

    mockGenerateScene.mockResolvedValue(gamingResponse)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(gamingRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockGenerateScene).toHaveBeenCalledWith(gamingRequest)
  })

  it('should limit variations to maximum of 5', async () => {
    mockGenerateSceneVariations.mockResolvedValue(mockSceneVariations.slice(0, 5))

    const request = new NextRequest('http://localhost:3000/api/ai-scene?variations=10', {
      method: 'POST',
      body: JSON.stringify(validSceneRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockGenerateSceneVariations).toHaveBeenCalledWith(validSceneRequest, 5)
  })

  it('should handle scene generation errors', async () => {
    mockGenerateScene.mockRejectedValue(new Error('Scene generation failed'))

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(validSceneRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
    expect(mockGenerateScene).toHaveBeenCalledWith(validSceneRequest)
  })

  it('should handle minimal style scenes', async () => {
    const minimalRequest = {
      ...validSceneRequest,
      style: 'Minimal' as const
    }

    const minimalResponse = {
      ...mockSceneResponse,
      style: 'Minimal'
    }

    mockGenerateScene.mockResolvedValue(minimalResponse)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(minimalRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.style).toBe('Minimal')
  })

  it('should include product titles in metadata', async () => {
    mockGenerateScene.mockResolvedValue(mockSceneResponse)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(validSceneRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.metadata.productTitles).toEqual([
      'Standing Desk Pro',
      'Ergonomic Office Chair'
    ])
  })

  it('should handle scenes without room type (inferred)', async () => {
    const requestWithoutRoomType = {
      products: mockProducts,
      style: 'Modern' as const
      // No roomType specified
    }

    mockGenerateScene.mockResolvedValue(mockSceneResponse)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(requestWithoutRoomType)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.metadata.roomType).toBe('inferred')
  })

  it('should calculate estimated generation time correctly', async () => {
    mockGenerateSceneVariations.mockResolvedValue(mockSceneVariations)

    const request = new NextRequest('http://localhost:3000/api/ai-scene?variations=3', {
      method: 'POST',
      body: JSON.stringify(validSceneRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Base time (30) + products (2 * 5) + variations ((3-1) * 20) = 30 + 10 + 40 = 80
    expect(data.metadata.estimatedGenerationTime).toBe(80)
  })

  it('should handle single product scenes', async () => {
    const singleProductRequest = {
      products: [mockProducts[0]],
      style: 'Modern' as const,
      roomType: 'office'
    }

    mockGenerateScene.mockResolvedValue(mockSceneResponse)

    const request = new NextRequest('http://localhost:3000/api/ai-scene', {
      method: 'POST',
      body: JSON.stringify(singleProductRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.productCount).toBe(1)
    expect(data.metadata.productTitles).toEqual(['Standing Desk Pro'])
  })
})
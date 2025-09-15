import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAIScene, useSceneStyleSuggestions, useSceneGallery } from '../use-ai-scene'
import { Product } from '@/types'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { vi } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { vi } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useAIScene', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProducts: Product[] = [
    {
      id: '1',
      title: 'Gaming Chair',
      price: 300,
      currency: 'USD',
      merchant: 'Amazon',
      rating: 4.5,
      reviewCount: 100,
      imageUrl: 'https://example.com/chair.jpg',
      productUrl: 'https://example.com/chair',
      rationale: 'Great gaming chair',
      category: 'Gaming',
      features: [],
      pros: [],
      cons: [],
      confidence: 0.9,
      searchRank: 1
    }
  ]

  it('should generate AI scene successfully', async () => {
    const mockResponse = {
      imageUrl: 'https://example.com/scene.jpg',
      prompt: 'A gaming setup with chair',
      style: 'Gaming'
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(
      () => useAIScene(),
      { wrapper: createWrapper() }
    )

    result.current.generateScene({
      products: mockProducts,
      style: 'Gaming'
    })

    await waitFor(() => {
      expect(result.current.sceneData).toEqual(mockResponse)
    })

    expect(fetch).toHaveBeenCalledWith('/api/ai-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: mockProducts,
        style: 'Gaming'
      }),
    })
  })

  it('should handle AI scene generation errors', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'AI scene generation failed' }),
    })

    const { result } = renderHook(
      () => useAIScene(),
      { wrapper: createWrapper() }
    )

    result.current.generateScene({
      products: mockProducts,
      style: 'Gaming'
    })

    await waitFor(() => {
      expect(result.current.error?.message).toBe('AI scene generation failed')
    })
  })
})

describe('useSceneStyleSuggestions', () => {
  it('should suggest Gaming style for gaming products', async () => {
    const gamingProducts: Product[] = [
      {
        id: '1',
        title: 'RGB Gaming Keyboard',
        price: 150,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 100,
        imageUrl: 'https://example.com/keyboard.jpg',
        productUrl: 'https://example.com/keyboard',
        rationale: 'Great gaming keyboard',
        category: 'Gaming',
        features: [],
        pros: [],
        cons: [],
        confidence: 0.9,
        searchRank: 1
      }
    ]

    const { result } = renderHook(
      () => useSceneStyleSuggestions(gamingProducts),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const suggestions = result.current.data || []
    expect(suggestions.some(s => s.style === 'Gaming')).toBe(true)
    expect(suggestions.find(s => s.style === 'Gaming')?.reason).toContain('gaming')
  })

  it('should suggest Modern style for high-end products', async () => {
    const modernProducts: Product[] = [
      {
        id: '1',
        title: 'Premium Wireless Monitor',
        price: 800,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.8,
        reviewCount: 50,
        imageUrl: 'https://example.com/monitor.jpg',
        productUrl: 'https://example.com/monitor',
        rationale: 'High-end monitor',
        category: 'Electronics',
        features: [],
        pros: [],
        cons: [],
        confidence: 0.9,
        searchRank: 1
      }
    ]

    const { result } = renderHook(
      () => useSceneStyleSuggestions(modernProducts),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const suggestions = result.current.data || []
    expect(suggestions.some(s => s.style === 'Modern')).toBe(true)
  })

  it('should always include Minimal as fallback', async () => {
    const basicProducts: Product[] = [
      {
        id: '1',
        title: 'Basic Desk',
        price: 100,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.0,
        reviewCount: 20,
        imageUrl: 'https://example.com/desk.jpg',
        productUrl: 'https://example.com/desk',
        rationale: 'Simple desk',
        category: 'Furniture',
        features: [],
        pros: [],
        cons: [],
        confidence: 0.8,
        searchRank: 1
      }
    ]

    const { result } = renderHook(
      () => useSceneStyleSuggestions(basicProducts),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const suggestions = result.current.data || []
    expect(suggestions.some(s => s.style === 'Minimal')).toBe(true)
  })
})

describe('useSceneGallery', () => {
  it('should manage scene gallery', () => {
    const { result } = renderHook(
      () => useSceneGallery(),
      { wrapper: createWrapper() }
    )

    const mockScene = {
      imageUrl: 'https://example.com/scene.jpg',
      prompt: 'A gaming setup',
      style: 'Gaming',
      products: mockProducts
    }

    // Initially empty
    expect(result.current.getGallery()).toHaveLength(0)

    // Add scene
    result.current.addToGallery(mockScene)
    expect(result.current.getGallery()).toHaveLength(1)
    expect(result.current.getGallery()[0]).toEqual(mockScene)

    // Clear gallery
    result.current.clearGallery()
    expect(result.current.getGallery()).toHaveLength(0)
  })

  it('should limit gallery to 20 scenes', () => {
    const { result } = renderHook(
      () => useSceneGallery(),
      { wrapper: createWrapper() }
    )

    // Add 25 scenes
    for (let i = 0; i < 25; i++) {
      result.current.addToGallery({
        imageUrl: `https://example.com/scene${i}.jpg`,
        prompt: `Scene ${i}`,
        style: 'Gaming',
        products: mockProducts
      })
    }

    // Should only keep 20
    expect(result.current.getGallery()).toHaveLength(20)
    // Should keep the most recent ones
    expect(result.current.getGallery()[0].prompt).toBe('Scene 24')
  })
})
import React, { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReroll } from '../use-reroll'

// Mock fetch
global.fetch = vi.fn()

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useReroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockRerollRequest = {
    originalQuery: 'office setup',
    settings: {
      style: 'Premium' as const,
      budget: 1000,
      currency: 'USD',
      resultsMode: 'Multiple' as const,
      region: 'US',
      amazonOnly: false
    },
    excludeIds: ['product-1']
  }

  const mockRerollResponse = {
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
      }
    ],
    budgetChart: [
      {
        category: 'chair',
        amount: 300,
        percentage: 30,
        color: '#3B82F6'
      }
    ],
    ghostTips: ['Fresh setup generated! 👻'],
    searchMetadata: {
      totalResults: 1,
      searchTime: 150,
      region: 'US',
      query: 'office setup (rerolled)'
    },
    isSetup: true
  }

  it('should successfully reroll setup', async () => {
    const mockOnSuccess = vi.fn()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRerollResponse
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useReroll({ onSuccess: mockOnSuccess }), { wrapper })

    result.current.reroll(mockRerollRequest)

    await waitFor(() => {
      expect(result.current.isRerolling).toBe(false)
    })

    expect(fetch).toHaveBeenCalledWith('/api/reroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockRerollRequest)
    })

    expect(mockOnSuccess).toHaveBeenCalledWith(mockRerollResponse)
  })

  it('should handle reroll error', async () => {
    const mockOnError = vi.fn()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Reroll failed' })
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useReroll({ onError: mockOnError }), { wrapper })

    result.current.reroll(mockRerollRequest)

    await waitFor(() => {
      expect(result.current.isRerolling).toBe(false)
    })

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Reroll failed'
      })
    )
  })

  it('should handle network error', async () => {
    const mockOnError = vi.fn()
    
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const wrapper = createWrapper()
    const { result } = renderHook(() => useReroll({ onError: mockOnError }), { wrapper })

    result.current.reroll(mockRerollRequest)

    await waitFor(() => {
      expect(result.current.isRerolling).toBe(false)
    })

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Network error'
      })
    )
  })

  it('should reset mutation state', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useReroll(), { wrapper })

    // Trigger an error first
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Test error'))
    result.current.reroll(mockRerollRequest)

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    // Reset should clear the error
    result.current.reset()

    await waitFor(() => {
      expect(result.current.error).toBeNull()
    })
  })

  it('should handle missing error message', async () => {
    const mockOnError = vi.fn()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}) // No message field
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useReroll({ onError: mockOnError }), { wrapper })

    result.current.reroll(mockRerollRequest)

    await waitFor(() => {
      expect(result.current.isRerolling).toBe(false)
    })

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to reroll setup'
      })
    )
  })

  it('should work without options', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRerollResponse
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useReroll(), { wrapper })

    result.current.reroll(mockRerollRequest)

    await waitFor(() => {
      expect(result.current.isRerolling).toBe(false)
    })

    expect(fetch).toHaveBeenCalledWith('/api/reroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockRerollRequest)
    })
  })
})
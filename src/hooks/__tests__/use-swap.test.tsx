import React, { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSwap, useSwapHistory } from '../use-swap'

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

describe('useSwap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSwapRequest = {
    productId: 'product-1',
    category: 'chair',
    budget: 500,
    settings: {
      style: 'Premium' as const,
      region: 'US',
      amazonOnly: false,
      currency: 'USD'
    },
    excludeIds: ['product-1']
  }

  const mockSwapResponse = {
    alternatives: [
      {
        id: 'alt-1',
        title: 'Alternative Chair 1',
        price: 450,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 100,
        imageUrl: 'https://example.com/chair1.jpg',
        productUrl: 'https://example.com/chair1',
        rationale: 'Great value for money',
        category: 'chair',
        features: ['Ergonomic'],
        pros: ['Comfortable'],
        cons: ['Assembly required'],
        confidence: 0.9,
        searchRank: 1
      }
    ],
    fromCache: false
  }

  it('should successfully swap product', async () => {
    const mockOnSuccess = vi.fn()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSwapResponse
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSwap({ onSuccess: mockOnSuccess }), { wrapper })

    result.current.swap(mockSwapRequest)

    await waitFor(() => {
      expect(result.current.isSwapping).toBe(false)
    })

    expect(fetch).toHaveBeenCalledWith('/api/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockSwapRequest)
    })

    expect(mockOnSuccess).toHaveBeenCalledWith(
      mockSwapResponse.alternatives,
      mockSwapRequest.productId
    )
  })

  it('should handle swap error', async () => {
    const mockOnError = vi.fn()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Swap failed' })
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSwap({ onError: mockOnError }), { wrapper })

    result.current.swap(mockSwapRequest)

    await waitFor(() => {
      expect(result.current.isSwapping).toBe(false)
    })

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Swap failed'
      })
    )
  })

  it('should handle network error', async () => {
    const mockOnError = vi.fn()
    
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSwap({ onError: mockOnError }), { wrapper })

    result.current.swap(mockSwapRequest)

    await waitFor(() => {
      expect(result.current.isSwapping).toBe(false)
    })

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Network error'
      })
    )
  })

  it('should reset mutation state', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useSwap(), { wrapper })

    // Trigger an error first
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Test error'))
    result.current.swap(mockSwapRequest)

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    // Reset should clear the error
    result.current.reset()

    await waitFor(() => {
      expect(result.current.error).toBeNull()
    })
  })
})

describe('useSwapHistory', () => {
  it('should manage swap history correctly', () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useSwapHistory(), { wrapper })

    // Initially empty
    expect(result.current.getSwapHistory('product-1')).toEqual([])

    // Add to history
    result.current.addToSwapHistory('product-1', 'alt-1')
    expect(result.current.getSwapHistory('product-1')).toEqual(['alt-1'])

    // Add another
    result.current.addToSwapHistory('product-1', 'alt-2')
    expect(result.current.getSwapHistory('product-1')).toEqual(['alt-1', 'alt-2'])

    // Clear specific product history
    result.current.clearSwapHistory('product-1')
    expect(result.current.getSwapHistory('product-1')).toEqual([])
  })

  it('should clear all swap history', () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useSwapHistory(), { wrapper })

    // Add history for multiple products
    result.current.addToSwapHistory('product-1', 'alt-1')
    result.current.addToSwapHistory('product-2', 'alt-2')

    expect(result.current.getSwapHistory('product-1')).toEqual(['alt-1'])
    expect(result.current.getSwapHistory('product-2')).toEqual(['alt-2'])

    // Clear all history
    result.current.clearSwapHistory()

    expect(result.current.getSwapHistory('product-1')).toEqual([])
    expect(result.current.getSwapHistory('product-2')).toEqual([])
  })

  it('should handle different products independently', () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useSwapHistory(), { wrapper })

    // Add history for different products
    result.current.addToSwapHistory('product-1', 'alt-1')
    result.current.addToSwapHistory('product-2', 'alt-2')

    expect(result.current.getSwapHistory('product-1')).toEqual(['alt-1'])
    expect(result.current.getSwapHistory('product-2')).toEqual(['alt-2'])

    // Clear only one product's history
    result.current.clearSwapHistory('product-1')

    expect(result.current.getSwapHistory('product-1')).toEqual([])
    expect(result.current.getSwapHistory('product-2')).toEqual(['alt-2'])
  })
})
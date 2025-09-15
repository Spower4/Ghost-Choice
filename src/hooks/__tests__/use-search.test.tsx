import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearch, useSearchMutation, useSearchSuggestions } from '../use-search'
import { SearchSettings } from '@/types'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
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

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSettings: SearchSettings = {
    style: 'Premium',
    budget: 1000,
    currency: 'USD',
    resultsMode: 'Multiple',
    region: 'US',
    amazonOnly: false
  }

  it('should fetch search results successfully', async () => {
    const mockResponse = {
      products: [],
      budgetChart: [],
      ghostTips: ['Test tip'],
      searchMetadata: { totalResults: 0, searchTime: 100, region: 'US', query: 'office' },
      isSetup: true
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(
      () => useSearch('office', mockSettings),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith('/api/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'office', settings: mockSettings }),
    })
  })

  it('should not fetch when query is empty', () => {
    const { result } = renderHook(
      () => useSearch('', mockSettings),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should handle search errors', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Search failed' }),
    })

    const { result } = renderHook(
      () => useSearch('office', mockSettings),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Search failed')
  })
})

describe('useSearchMutation', () => {
  it('should trigger search mutation', async () => {
    const mockResponse = {
      products: [],
      budgetChart: [],
      ghostTips: ['Test tip'],
      searchMetadata: { totalResults: 0, searchTime: 100, region: 'US', query: 'office' },
      isSetup: true
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(
      () => useSearchMutation(),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ query: 'office', settings: mockSettings })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
  })
})

describe('useSearchSuggestions', () => {
  it('should return suggestions for query', async () => {
    const { result } = renderHook(
      () => useSearchSuggestions('office'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toContain('office setup')
  })

  it('should return common suggestions for empty query', async () => {
    const { result } = renderHook(
      () => useSearchSuggestions(''),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(5)
    expect(result.current.data).toContain('office setup')
  })
})
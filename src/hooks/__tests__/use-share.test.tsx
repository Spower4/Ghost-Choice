import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useShare, useSharedSetup, useCopyToClipboard, useExport } from '../use-share'
import { Product, SearchSettings } from '@/types'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
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
import { vi } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

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

describe('useShare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSetup = {
    query: 'office setup',
    products: [] as Product[],
    totalCost: 500,
    settings: {
      style: 'Premium',
      budget: 1000,
      currency: 'USD',
      resultsMode: 'Multiple',
      region: 'US',
      amazonOnly: false
    } as SearchSettings
  }

  it('should create share link successfully', async () => {
    const mockResponse = {
      shareId: 'abc123',
      shortUrl: 'https://ghost.app/s/abc123',
      expiresAt: new Date()
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(
      () => useShare(),
      { wrapper: createWrapper() }
    )

    result.current.createShareLink(mockSetup)

    await waitFor(() => {
      expect(result.current.shareData).toEqual(mockResponse)
    })

    expect(fetch).toHaveBeenCalledWith('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setup: mockSetup }),
    })
  })

  it('should handle share errors', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Share failed' }),
    })

    const { result } = renderHook(
      () => useShare(),
      { wrapper: createWrapper() }
    )

    result.current.createShareLink(mockSetup)

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Share failed')
    })
  })
})

describe('useSharedSetup', () => {
  it('should fetch shared setup successfully', async () => {
    const mockSetup = {
      query: 'office setup',
      products: [],
      totalCost: 500,
      settings: {
        style: 'Premium',
        budget: 1000,
        currency: 'USD',
        resultsMode: 'Multiple',
        region: 'US',
        amazonOnly: false
      }
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSetup,
    })

    const { result } = renderHook(
      () => useSharedSetup('abc123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockSetup)
    expect(fetch).toHaveBeenCalledWith('/api/share/abc123', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('should handle 404 errors for expired links', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    })

    const { result } = renderHook(
      () => useSharedSetup('invalid'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Shared setup not found or has expired')
  })
})

describe('useCopyToClipboard', () => {
  it('should copy text to clipboard successfully', async () => {
    const { result } = renderHook(
      () => useCopyToClipboard(),
      { wrapper: createWrapper() }
    )

    result.current.copyToClipboard('test text')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
  })
})

describe('useExport', () => {
  const mockSetup = {
    query: 'office setup',
    products: [
      {
        id: '1',
        title: 'Test Chair',
        price: 200,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 100,
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
    ] as Product[],
    totalCost: 200,
    settings: {
      style: 'Premium',
      budget: 1000,
      currency: 'USD',
      resultsMode: 'Multiple',
      region: 'US',
      amazonOnly: false
    } as SearchSettings
  }

  it('should export to markdown format', async () => {
    const { result } = renderHook(
      () => useExport(),
      { wrapper: createWrapper() }
    )

    result.current.exportSetup({ setup: mockSetup, format: 'markdown' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.exportData).toContain('# office setup Setup')
    expect(result.current.exportData).toContain('Test Chair')
  })

  it('should export to plaintext format', async () => {
    const { result } = renderHook(
      () => useExport(),
      { wrapper: createWrapper() }
    )

    result.current.exportSetup({ setup: mockSetup, format: 'plaintext' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.exportData).toContain('OFFICE SETUP SETUP')
    expect(result.current.exportData).toContain('Test Chair')
  })

  it('should generate Google Docs link', async () => {
    const { result } = renderHook(
      () => useExport(),
      { wrapper: createWrapper() }
    )

    result.current.exportSetup({ setup: mockSetup, format: 'googledocs' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.exportData).toContain('https://docs.google.com/document/create')
  })
})
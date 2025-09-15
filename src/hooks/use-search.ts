'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BuildRequest, BuildResponse, SearchRequest, SearchResponse } from '@/types/api'
import { SearchSettings } from '@/types'

interface UseSearchOptions {
  enabled?: boolean
  onSuccess?: (data: BuildResponse) => void
  onError?: (error: Error) => void
}

// Main search hook that uses the /api/build endpoint (orchestrator)
export function useSearch(query: string, settings: SearchSettings, options: UseSearchOptions = {}) {
  return useQuery({
    queryKey: ['search', query, settings],
    queryFn: async (): Promise<BuildResponse> => {
      const request: BuildRequest = {
        query,
        settings
      }

      const response = await fetch('/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Search failed')
      }

      return response.json()
    },
    enabled: options.enabled !== false && !!query.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on validation errors (4xx)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status
        if (status >= 400 && status < 500) {
          return false
        }
      }
      return failureCount < 2
    }
  })
}

// Hook for manual search triggering (mutation-based)
export function useSearchMutation(options: UseSearchOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ query, settings }: { query: string; settings: SearchSettings }): Promise<BuildResponse> => {
      const request: BuildRequest = {
        query,
        settings
      }

      const response = await fetch('/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Search failed')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Cache the result for future queries
      queryClient.setQueryData(['search', variables.query, variables.settings], data)
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Search failed:', error)
      options.onError?.(error as Error)
    }
  })
}

// Hook for direct product search (using /api/search endpoint)
export function useProductSearch(searchParams: SearchRequest, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['productSearch', searchParams],
    queryFn: async (): Promise<SearchResponse> => {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Product search failed')
      }

      return response.json()
    },
    enabled: options.enabled !== false && !!searchParams.query.trim(),
    staleTime: 1000 * 60 * 10, // 10 minutes for product searches
    gcTime: 1000 * 60 * 60, // 1 hour
  })
}

// Hook for search suggestions and autocomplete
export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['searchSuggestions', query],
    queryFn: async (): Promise<string[]> => {
      // This could be enhanced to call a suggestions API
      // For now, return some common suggestions based on query
      const commonSuggestions = [
        'office setup',
        'gaming setup',
        'home office',
        'bedroom setup',
        'kitchen essentials',
        'living room',
        'study desk',
        'gaming chair',
        'monitor',
        'keyboard',
        'mouse',
        'headphones'
      ]

      if (!query.trim()) {
        return commonSuggestions.slice(0, 5)
      }

      return commonSuggestions
        .filter(suggestion =>
          suggestion.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
    },
    enabled: query.length >= 1,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}
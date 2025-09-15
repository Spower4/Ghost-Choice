'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SwapRequest, SwapResponse } from '@/types/api'
import { Product } from '@/types'

interface UseSwapOptions {
  onSuccess?: (alternatives: Product[], productId: string) => void
  onError?: (error: Error) => void
}

export function useSwap(options: UseSwapOptions = {}) {
  const queryClient = useQueryClient()

  const swapMutation = useMutation({
    mutationFn: async (request: SwapRequest): Promise<SwapResponse> => {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to swap product')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['build'] })
      
      options.onSuccess?.(data.alternatives, variables.productId)
    },
    onError: (error) => {
      console.error('Swap failed:', error)
      options.onError?.(error as Error)
    }
  })

  return {
    swap: swapMutation.mutate,
    isSwapping: swapMutation.isPending,
    error: swapMutation.error,
    reset: swapMutation.reset
  }
}

// Hook for managing swap history to prevent showing same alternatives
export function useSwapHistory() {
  const queryClient = useQueryClient()
  
  const getSwapHistory = (productId: string): string[] => {
    return queryClient.getQueryData(['swapHistory', productId]) || []
  }

  const addToSwapHistory = (productId: string, swappedId: string) => {
    const history = getSwapHistory(productId)
    const newHistory = [...history, swappedId]
    queryClient.setQueryData(['swapHistory', productId], newHistory)
  }

  const clearSwapHistory = (productId?: string) => {
    if (productId) {
      queryClient.removeQueries({ queryKey: ['swapHistory', productId] })
    } else {
      queryClient.removeQueries({ queryKey: ['swapHistory'] })
    }
  }

  return {
    getSwapHistory,
    addToSwapHistory,
    clearSwapHistory
  }
}
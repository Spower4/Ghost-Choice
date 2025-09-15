'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RerollRequest, RerollResponse } from '@/types/api'

interface UseRerollOptions {
  onSuccess?: (data: RerollResponse) => void
  onError?: (error: Error) => void
}

export function useReroll(options: UseRerollOptions = {}) {
  const queryClient = useQueryClient()

  const rerollMutation = useMutation({
    mutationFn: async (request: RerollRequest): Promise<RerollResponse> => {
      const response = await fetch('/api/reroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to reroll setup')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['build'] })
      
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Reroll failed:', error)
      options.onError?.(error as Error)
    }
  })

  return {
    reroll: rerollMutation.mutate,
    isRerolling: rerollMutation.isPending,
    error: rerollMutation.error,
    reset: rerollMutation.reset
  }
}
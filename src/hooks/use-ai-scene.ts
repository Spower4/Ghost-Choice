'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SceneRequest, SceneResponse } from '@/types/api'
import { Product } from '@/types'

interface UseAISceneOptions {
  onSuccess?: (data: SceneResponse) => void
  onError?: (error: Error) => void
}

interface SceneGenerationRequest {
  products: Product[]
  style: 'Cozy' | 'Minimal' | 'Gaming' | 'Modern'
  roomType?: string
}

// Hook for generating AI scenes
export function useAIScene(options: UseAISceneOptions = {}) {
  const queryClient = useQueryClient()

  const sceneMutation = useMutation({
    mutationFn: async (request: SceneGenerationRequest): Promise<SceneResponse> => {
      const sceneRequest: SceneRequest = {
        products: request.products,
        style: request.style,
        roomType: request.roomType
      }

      const response = await fetch('/api/ai-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sceneRequest),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate AI scene')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Cache the generated scene
      const cacheKey = generateSceneCacheKey(variables.products, variables.style, variables.roomType)
      queryClient.setQueryData(['aiScene', cacheKey], data)
      
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('AI scene generation failed:', error)
      options.onError?.(error as Error)
    }
  })

  return {
    generateScene: sceneMutation.mutate,
    isGenerating: sceneMutation.isPending,
    sceneData: sceneMutation.data,
    error: sceneMutation.error,
    reset: sceneMutation.reset
  }
}

// Hook for retrieving cached AI scenes
export function useCachedAIScene(
  products: Product[], 
  style: 'Cozy' | 'Minimal' | 'Gaming' | 'Modern',
  roomType?: string,
  options: { enabled?: boolean } = {}
) {
  const cacheKey = generateSceneCacheKey(products, style, roomType)
  
  return useQuery({
    queryKey: ['aiScene', cacheKey],
    queryFn: async (): Promise<SceneResponse | null> => {
      // This will only return cached data, not make a new request
      return null
    },
    enabled: options.enabled !== false && products.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

// Hook for managing multiple scene generations (batch)
export function useMultipleAIScenes(options: UseAISceneOptions = {}) {
  const queryClient = useQueryClient()

  const batchSceneMutation = useMutation({
    mutationFn: async (requests: SceneGenerationRequest[]): Promise<SceneResponse[]> => {
      // Generate scenes sequentially to avoid overwhelming the API
      const results: SceneResponse[] = []
      
      for (const request of requests) {
        const sceneRequest: SceneRequest = {
          products: request.products,
          style: request.style,
          roomType: request.roomType
        }

        const response = await fetch('/api/ai-scene', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sceneRequest),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || `Failed to generate AI scene for ${request.style} style`)
        }

        const sceneData = await response.json()
        results.push(sceneData)

        // Cache each generated scene
        const cacheKey = generateSceneCacheKey(request.products, request.style, request.roomType)
        queryClient.setQueryData(['aiScene', cacheKey], sceneData)
      }

      return results
    },
    onSuccess: (data) => {
      options.onSuccess?.(data[0]) // Return first scene for compatibility
    },
    onError: (error) => {
      console.error('Batch AI scene generation failed:', error)
      options.onError?.(error as Error)
    }
  })

  return {
    generateMultipleScenes: batchSceneMutation.mutate,
    isGenerating: batchSceneMutation.isPending,
    scenesData: batchSceneMutation.data,
    error: batchSceneMutation.error,
    reset: batchSceneMutation.reset
  }
}

// Hook for scene style suggestions based on products
export function useSceneStyleSuggestions(products: Product[]) {
  return useQuery({
    queryKey: ['sceneStyleSuggestions', products.map(p => p.id).sort().join(',')],
    queryFn: async (): Promise<{ style: string; reason: string }[]> => {
      // Analyze products to suggest appropriate scene styles
      const suggestions: { style: string; reason: string }[] = []
      
      const categories = products.map(p => p.category?.toLowerCase() || '').filter(Boolean)
      const titles = products.map(p => p.title.toLowerCase())
      
      // Gaming style detection
      const gamingKeywords = ['gaming', 'rgb', 'mechanical', 'headset', 'monitor', 'keyboard', 'mouse']
      const hasGamingItems = titles.some(title => 
        gamingKeywords.some(keyword => title.includes(keyword))
      ) || categories.includes('gaming')
      
      if (hasGamingItems) {
        suggestions.push({
          style: 'Gaming',
          reason: 'Detected gaming peripherals and accessories'
        })
      }

      // Modern style detection
      const modernKeywords = ['sleek', 'modern', 'contemporary', 'minimalist', 'wireless']
      const hasModernItems = titles.some(title => 
        modernKeywords.some(keyword => title.includes(keyword))
      )
      
      if (hasModernItems || products.some(p => p.price > 200)) {
        suggestions.push({
          style: 'Modern',
          reason: 'High-end or contemporary design products detected'
        })
      }

      // Cozy style detection
      const cozyKeywords = ['wood', 'warm', 'comfortable', 'soft', 'cushion', 'lamp']
      const hasCozyItems = titles.some(title => 
        cozyKeywords.some(keyword => title.includes(keyword))
      )
      
      if (hasCozyItems) {
        suggestions.push({
          style: 'Cozy',
          reason: 'Comfortable and warm design elements found'
        })
      }

      // Minimal style (default fallback)
      suggestions.push({
        style: 'Minimal',
        reason: 'Clean and simple aesthetic'
      })

      return suggestions.slice(0, 3) // Return top 3 suggestions
    },
    enabled: products.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  })
}

// Helper function to generate consistent cache keys
function generateSceneCacheKey(
  products: Product[], 
  style: string, 
  roomType?: string
): string {
  const productIds = products.map(p => p.id).sort().join(',')
  const key = `${productIds}-${style}`
  return roomType ? `${key}-${roomType}` : key
}

// Hook for scene gallery management
export function useSceneGallery() {
  const queryClient = useQueryClient()

  const addToGallery = (scene: SceneResponse & { products: Product[]; style: string }) => {
    const gallery = queryClient.getQueryData<(SceneResponse & { products: Product[]; style: string })[]>(['sceneGallery']) || []
    const newGallery = [scene, ...gallery].slice(0, 20) // Keep last 20 scenes
    queryClient.setQueryData(['sceneGallery'], newGallery)
  }

  const getGallery = (): (SceneResponse & { products: Product[]; style: string })[] => {
    return queryClient.getQueryData(['sceneGallery']) || []
  }

  const clearGallery = () => {
    queryClient.removeQueries({ queryKey: ['sceneGallery'] })
  }

  return {
    addToGallery,
    getGallery,
    clearGallery
  }
}
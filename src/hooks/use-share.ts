'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShareRequest, ShareResponse } from '@/types/api'
import { Product, SearchSettings, BudgetDistribution } from '@/types'

interface UseShareOptions {
  onSuccess?: (data: ShareResponse) => void
  onError?: (error: Error) => void
}

interface ShareSetup {
  query: string
  products: Product[]
  budgetDistribution?: BudgetDistribution[]
  totalCost: number
  settings: SearchSettings
}

// Hook for creating shareable links
export function useShare(options: UseShareOptions = {}) {
  const queryClient = useQueryClient()

  const shareMutation = useMutation({
    mutationFn: async (setup: ShareSetup): Promise<ShareResponse> => {
      const request: ShareRequest = {
        setup
      }

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create share link')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Cache the shared setup for quick access
      queryClient.setQueryData(['sharedSetup', data.shareId], variables)
      
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Share failed:', error)
      options.onError?.(error as Error)
    }
  })

  return {
    createShareLink: shareMutation.mutate,
    isSharing: shareMutation.isPending,
    shareData: shareMutation.data,
    error: shareMutation.error,
    reset: shareMutation.reset
  }
}

// Hook for retrieving shared setups
export function useSharedSetup(shareId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['sharedSetup', shareId],
    queryFn: async (): Promise<ShareSetup> => {
      const response = await fetch(`/api/share/${shareId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Shared setup not found or has expired')
        }
        const error = await response.json()
        throw new Error(error.message || 'Failed to load shared setup')
      }

      return response.json()
    },
    enabled: options.enabled !== false && !!shareId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (expired/not found)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status
        if (status === 404) {
          return false
        }
      }
      return failureCount < 2
    }
  })
}

// Hook for copying to clipboard with feedback
export function useCopyToClipboard() {
  const copyMutation = useMutation({
    mutationFn: async (text: string): Promise<void> => {
      if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
        } catch (err) {
          throw new Error('Failed to copy to clipboard')
        } finally {
          document.body.removeChild(textArea)
        }
      } else {
        await navigator.clipboard.writeText(text)
      }
    },
    onSuccess: () => {
      // Could trigger a toast notification here
      console.log('Copied to clipboard successfully')
    },
    onError: (error) => {
      console.error('Failed to copy to clipboard:', error)
    }
  })

  return {
    copyToClipboard: copyMutation.mutate,
    isCopying: copyMutation.isPending,
    error: copyMutation.error,
    isSuccess: copyMutation.isSuccess,
    reset: copyMutation.reset
  }
}

// Hook for generating export formats
export function useExport() {
  const exportMutation = useMutation({
    mutationFn: async ({ 
      setup, 
      format 
    }: { 
      setup: ShareSetup; 
      format: 'markdown' | 'plaintext' | 'googledocs' 
    }): Promise<string> => {
      switch (format) {
        case 'markdown':
          return generateMarkdownExport(setup)
        case 'plaintext':
          return generatePlaintextExport(setup)
        case 'googledocs':
          return generateGoogleDocsLink(setup)
        default:
          throw new Error('Unsupported export format')
      }
    }
  })

  return {
    exportSetup: exportMutation.mutate,
    isExporting: exportMutation.isPending,
    exportData: exportMutation.data,
    error: exportMutation.error,
    reset: exportMutation.reset
  }
}

// Helper functions for export formats
function generateMarkdownExport(setup: ShareSetup): string {
  let markdown = `# ${setup.query} Setup\n\n`
  
  if (setup.budgetDistribution && setup.budgetDistribution.length > 0) {
    markdown += `**Total Budget:** $${setup.totalCost.toFixed(2)}\n\n`
    markdown += `## Budget Distribution\n\n`
    setup.budgetDistribution.forEach(item => {
      markdown += `- **${item.category}:** $${item.amount.toFixed(2)} (${item.percentage.toFixed(1)}%)\n`
    })
    markdown += `\n`
  }

  markdown += `## Products\n\n`
  
  setup.products.forEach((product, index) => {
    markdown += `### ${index + 1}. ${product.title}\n\n`
    markdown += `- **Price:** $${product.price.toFixed(2)}\n`
    markdown += `- **Rating:** ${product.rating}/5 ⭐\n`
    markdown += `- **Merchant:** ${product.merchant}\n`
    if (product.category) {
      markdown += `- **Category:** ${product.category}\n`
    }
    markdown += `- **Link:** [View Product](${product.productUrl})\n`
    if (product.rationale) {
      markdown += `- **Why this product:** ${product.rationale}\n`
    }
    markdown += `\n`
  })

  return markdown
}

function generatePlaintextExport(setup: ShareSetup): string {
  let text = `${setup.query.toUpperCase()} SETUP\n`
  text += `${'='.repeat(setup.query.length + 6)}\n\n`
  
  if (setup.budgetDistribution && setup.budgetDistribution.length > 0) {
    text += `Total Budget: $${setup.totalCost.toFixed(2)}\n\n`
    text += `Budget Distribution:\n`
    setup.budgetDistribution.forEach(item => {
      text += `- ${item.category}: $${item.amount.toFixed(2)} (${item.percentage.toFixed(1)}%)\n`
    })
    text += `\n`
  }

  text += `Products:\n`
  text += `---------\n\n`
  
  setup.products.forEach((product, index) => {
    text += `${index + 1}. ${product.title}\n`
    text += `   Price: $${product.price.toFixed(2)}\n`
    text += `   Rating: ${product.rating}/5\n`
    text += `   Merchant: ${product.merchant}\n`
    if (product.category) {
      text += `   Category: ${product.category}\n`
    }
    text += `   Link: ${product.productUrl}\n`
    if (product.rationale) {
      text += `   Why: ${product.rationale}\n`
    }
    text += `\n`
  })

  return text
}

function generateGoogleDocsLink(setup: ShareSetup): string {
  const markdown = generateMarkdownExport(setup)
  const encodedContent = encodeURIComponent(markdown)
  return `https://docs.google.com/document/create?title=${encodeURIComponent(setup.query + ' Setup')}&body=${encodedContent}`
}
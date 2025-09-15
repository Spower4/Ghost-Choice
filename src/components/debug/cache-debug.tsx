'use client'

import { useState } from 'react'

export function CacheDebug() {
  const [isClearing, setIsClearing] = useState(false)
  const [result, setResult] = useState<string>('')

  const clearCache = async () => {
    setIsClearing(true)
    setResult('')
    
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(`✅ Cleared ${data.clearedKeys} cache entries`)
      } else {
        setResult(`❌ Failed to clear cache: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`)
    } finally {
      setIsClearing(false)
    }
  }

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg z-50">
      <div className="text-sm font-medium mb-2">Cache Debug</div>
      <button
        onClick={clearCache}
        disabled={isClearing}
        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded disabled:opacity-50"
      >
        {isClearing ? 'Clearing...' : 'Clear Cache'}
      </button>
      {result && (
        <div className="mt-2 text-xs text-muted-foreground">
          {result}
        </div>
      )}
    </div>
  )
}
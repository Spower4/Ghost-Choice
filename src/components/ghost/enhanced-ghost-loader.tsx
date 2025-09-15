'use client'

import { useEffect, useState, useRef } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

interface LoadingItem {
  id: string
  name: string
  status: 'pending' | 'loading' | 'completed'
  completedAt?: number
}

interface Product {
  id: string
  name: string
  status: 'pending' | 'analyzing' | 'completed'
}

interface EnhancedGhostLoaderProps {
  isLoading: boolean
  query: string
  products?: Product[]
  className?: string
}

// Generate dynamic loading steps based on query complexity
function generateLoadingItems(query: string): LoadingItem[] {
  const lowerQuery = query.toLowerCase()
  
  // Check if this is a single item query
  const isSingleItem = detectSingleItemQuery(lowerQuery)
  
  if (isSingleItem) {
    // Single item queries have fewer, more focused steps
    return [
      { id: '1', name: 'Analyzing your requirements', status: 'pending' },
      { id: '2', name: 'Searching for best options', status: 'pending' },
      { id: '3', name: 'Comparing prices & reviews', status: 'pending' },
      { id: '4', name: 'Finalizing recommendations', status: 'pending' }
    ]
  }
  
  // Estimate number of categories based on setup query type
  let estimatedCategories = 5 // default
  
  if (lowerQuery.includes('gaming')) {
    estimatedCategories = 7 // PC, Monitor, Chair, Desk, Keyboard, Mouse, Headset
  } else if (lowerQuery.includes('office')) {
    estimatedCategories = 6 // Computer, Chair, Desk, Monitor, Accessories, Lighting
  } else if (lowerQuery.includes('bedroom')) {
    estimatedCategories = 6 // Bed, Mattress, Dresser, Nightstand, Lighting, Decor
  } else if (lowerQuery.includes('kitchen')) {
    estimatedCategories = 8 // Appliances, Cookware, Storage, etc.
  }
  
  // Generate steps based on estimated categories
  const steps = [
    { id: '1', name: 'Analyzing your requirements', status: 'pending' },
    { id: '2', name: 'Identifying product categories', status: 'pending' },
    { id: '3', name: 'Searching product databases', status: 'pending' },
    { id: '4', name: 'Comparing prices & reviews', status: 'pending' },
    { id: '5', name: 'AI selecting best matches', status: 'pending' },
    { id: '6', name: 'Optimizing for budget', status: 'pending' },
    { id: '7', name: 'Finalizing recommendations', status: 'pending' }
  ]
  
  // Return appropriate number of steps (minimum 5, maximum 7)
  return steps.slice(0, Math.max(5, Math.min(estimatedCategories, 7)))
}

// Helper function to detect single item queries (duplicate from build route)
function detectSingleItemQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim()
  
  // Common single item patterns
  const singleItemKeywords = [
    'watch', 'watches', 'smartwatch', 'phone', 'smartphone', 'tablet', 'laptop', 'headphones', 'earbuds',
    'speaker', 'camera', 'tv', 'television', 'monitor', 'keyboard', 'mouse', 'charger',
    'shirt', 'pants', 'shoes', 'jacket', 'hat', 'bag', 'backpack', 'wallet', 'sunglasses',
    'bottle', 'water bottle', 'mug', 'cup', 'pillow', 'blanket', 'lamp', 'chair', 'table',
    'book', 'notebook', 'pen', 'pencil', 'umbrella', 'towel'
  ]
  
  // Setup keywords that indicate multiple items
  const setupKeywords = [
    'setup', 'collection', 'kit', 'set', 'bundle', 'essentials', 'gear', 'equipment',
    'system', 'station', 'workspace', 'room', 'office', 'gaming', 'bedroom', 'kitchen'
  ]
  
  // If query contains setup keywords, it's not a single item
  for (const keyword of setupKeywords) {
    if (lowerQuery.includes(keyword)) {
      return false
    }
  }
  
  // Check if query matches single item patterns
  for (const keyword of singleItemKeywords) {
    if (lowerQuery === keyword || lowerQuery === keyword + 's' || lowerQuery.includes(keyword)) {
      return true
    }
  }
  
  // If query is very short (1-2 meaningful words), likely single item
  const words = lowerQuery.split(' ').filter(w => w.length > 2)
  if (words.length <= 2) {
    return true
  }
  
  return false
}

export function EnhancedGhostLoader({ 
  isLoading, 
  query,
  products = [],
  className = '' 
}: EnhancedGhostLoaderProps) {
  const [items, setItems] = useState<LoadingItem[]>([])
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [currentItem, setCurrentItem] = useState<LoadingItem | null>(null)
  const [riveLoadError, setRiveLoadError] = useState(false)
  const [showProducts, setShowProducts] = useState(false)

  // Rive animation setup with much larger size
  const { rive, RiveComponent } = useRive({
    src: '/assets/rive/ghost.riv',
    autoplay: true,
    onLoadError: (error) => {
      console.warn('Rive animation failed to load:', error)
      setRiveLoadError(true)
    }
  })

  // State machine inputs for controlling ghost animation
  const isSearchingInput = useStateMachineInput(rive, 'GhostStateMachine', 'isSearching', false)

  // Update animation state
  useEffect(() => {
    if (isSearchingInput) {
      try {
        isSearchingInput.value = isLoading
      } catch (error) {
        console.warn('Failed to update Rive state machine:', error)
      }
    }
  }, [isLoading, isSearchingInput])

  // Initialize items when loading starts
  useEffect(() => {
    if (isLoading) {
      const loadingItems = generateLoadingItems(query)
      setItems(loadingItems)
      setCurrentItemIndex(0)
      setCurrentItem({ ...loadingItems[0], status: 'loading' })
      setShowProducts(false)
      
      // Start the sequential loading process
      let currentIndex = 0
      
      const processNextItem = () => {
        if (currentIndex < loadingItems.length) {
          const item = loadingItems[currentIndex]
          
          // Set current item to loading
          setCurrentItem({ ...item, status: 'loading' })
          
          // After a delay, mark as completed
          const delay = Math.random() * 2000 + 1500 // 1.5-3.5 seconds
          
          setTimeout(() => {
            // Show completed state
            setCurrentItem({ ...item, status: 'completed', completedAt: Date.now() })
            
            // After showing tick for a moment, move to next item
            setTimeout(() => {
              currentIndex++
              setCurrentItemIndex(currentIndex)
              
              // If we're at the last item and have products, switch to product view
              if (currentIndex >= loadingItems.length && products.length > 0) {
                setShowProducts(true)
              } else if (currentIndex < loadingItems.length) {
                processNextItem()
              }
            }, 800) // Show tick for 800ms before moving to next
          }, delay)
        }
      }
      
      // Start processing after initial delay
      setTimeout(processNextItem, 500)
    } else {
      // Reset when not loading
      setItems([])
      setCurrentItemIndex(0)
      setCurrentItem(null)
      setShowProducts(false)
    }
  }, [isLoading, query, products.length])

  if (!isLoading) {
    return null
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-8 ${className}`}>
      {/* Much Larger Ghost Animation Container */}
      <div className="relative">
        {/* Floating animation wrapper */}
        <div className="animate-float">
          <div className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
            {!riveLoadError ? (
              <RiveComponent 
                className="w-full h-full"
                onError={() => {
                  console.warn('Rive component failed, using fallback')
                  setRiveLoadError(true)
                }}
              />
            ) : (
              // Fallback ghost animation - much larger
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-9xl md:text-[12rem] lg:text-[14rem] animate-bounce">👻</div>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* AI is choosing items message */}
      <div className="text-center">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          AI is choosing your items...
        </h2>
        <p className="text-muted-foreground">
          Analyzing the best products for your {query}
        </p>
      </div>

      {/* Single Current Item Display */}
      {currentItem && (
        <div className="w-full max-w-md mx-auto">
          <div 
            className={`flex items-center justify-between p-6 rounded-xl border-2 transition-all duration-500 ${
              currentItem.status === 'completed' 
                ? 'bg-green-900/20 border-green-500/50 shadow-green-500/20 shadow-lg' 
                : currentItem.status === 'loading'
                ? 'bg-blue-900/20 border-blue-500/50 shadow-blue-500/20 shadow-lg'
                : 'bg-card border-border'
            }`}
          >
            <span className="font-semibold text-lg text-foreground">{currentItem.name}</span>
            
            <div className="flex items-center">
              {currentItem.status === 'loading' && (
                <div className="w-8 h-8">
                  <div className="w-full h-full border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {currentItem.status === 'completed' && (
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{Math.min(currentItemIndex + (currentItem?.status === 'completed' ? 1 : 0), items.length)} / {items.length}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${Math.min(((currentItemIndex + (currentItem?.status === 'completed' ? 1 : 0)) / items.length) * 100, 100)}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}
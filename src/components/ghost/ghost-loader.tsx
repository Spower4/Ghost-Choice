'use client'

import { useEffect, useState, useRef } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

interface GhostLoaderProps {
  isLoading: boolean
  tips: string[]
  currentTip?: string
  animationState?: 'idle' | 'searching' | 'thinking'
  className?: string
}

const DEFAULT_TIPS = [
  "Searching the web for you... 👻",
  "Chairs with lumbar support are trending today 👻",
  "Pro tip: Premium style gets you higher quality items 👻",
  "Budget-friendly doesn't mean low quality 👻",
  "Amazon has great return policies 👻",
  "Check reviews before buying 👻",
  "Gaming setups are popular this season 👻",
  "Standing desks boost productivity 👻"
]

export function GhostLoader({ 
  isLoading, 
  tips = DEFAULT_TIPS, 
  currentTip,
  animationState = 'idle',
  className = '' 
}: GhostLoaderProps) {
  const [displayedTip, setDisplayedTip] = useState(currentTip || tips[0] || DEFAULT_TIPS[0])
  const [tipIndex, setTipIndex] = useState(0)
  const [riveLoadError, setRiveLoadError] = useState(false)
  const tipRotationRef = useRef<NodeJS.Timeout>()

  // Rive animation setup
  const { rive, RiveComponent } = useRive({
    src: '/assets/rive/ghost.riv',
    autoplay: true,
    onLoadError: (error) => {
      console.warn('Rive animation failed to load:', error)
      setRiveLoadError(true)
    }
  })

  // State machine inputs for controlling ghost animation (optional)
  const isSearchingInput = useStateMachineInput(rive, 'GhostStateMachine', 'isSearching', false)
  const isThinkingInput = useStateMachineInput(rive, 'GhostStateMachine', 'isThinking', false)

  // Update animation state based on props
  useEffect(() => {
    if (isSearchingInput && isThinkingInput) {
      try {
        switch (animationState) {
          case 'searching':
            isSearchingInput.value = true
            isThinkingInput.value = false
            break
          case 'thinking':
            isSearchingInput.value = false
            isThinkingInput.value = true
            break
          case 'idle':
          default:
            isSearchingInput.value = false
            isThinkingInput.value = false
            break
        }
      } catch (error) {
        console.warn('Failed to update Rive state machine:', error)
      }
    }
  }, [animationState, isSearchingInput, isThinkingInput])

  // Handle tip rotation when loading
  useEffect(() => {
    if (isLoading && tips.length > 1) {
      // Clear any existing interval
      if (tipRotationRef.current) {
        clearInterval(tipRotationRef.current)
      }

      // Start tip rotation
      tipRotationRef.current = setInterval(() => {
        setTipIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % tips.length
          setDisplayedTip(tips[nextIndex])
          return nextIndex
        })
      }, 3000) // Change tip every 3 seconds

      return () => {
        if (tipRotationRef.current) {
          clearInterval(tipRotationRef.current)
        }
      }
    } else {
      // Clear interval when not loading
      if (tipRotationRef.current) {
        clearInterval(tipRotationRef.current)
      }
    }
  }, [isLoading, tips])

  // Update displayed tip when currentTip prop changes
  useEffect(() => {
    if (currentTip) {
      setDisplayedTip(currentTip)
    }
  }, [currentTip])

  if (!isLoading) {
    return null
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-6 ${className}`}>
      {/* Ghost Animation Container */}
      <div className="relative">
        {/* Floating animation wrapper */}
        <div className="animate-float">
          <div className="w-32 h-32 md:w-40 md:h-40">
            {!riveLoadError ? (
              <RiveComponent 
                className="w-full h-full"
                onError={() => {
                  console.warn('Rive component failed, using fallback')
                  setRiveLoadError(true)
                }}
              />
            ) : (
              // Fallback ghost animation
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl md:text-7xl animate-bounce">👻</div>
              </div>
            )}
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 -z-10">
          <div className="w-full h-full bg-blue-200 rounded-full blur-xl opacity-30 animate-pulse"></div>
        </div>
      </div>

      {/* Tip Display */}
      <div className="text-center max-w-md mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-gray-200">
          <p className="text-gray-700 font-medium text-sm md:text-base animate-fade-in">
            {displayedTip}
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}

// Utility function to generate contextual tips
export function generateContextualTips(query: string, settings: any): string[] {
  const baseTips = [...DEFAULT_TIPS]
  
  // Add query-specific tips
  if (query.toLowerCase().includes('office')) {
    baseTips.push("Ergonomic office chairs reduce back pain 👻")
    baseTips.push("Monitor arms help with neck strain 👻")
  }
  
  if (query.toLowerCase().includes('gaming')) {
    baseTips.push("RGB lighting is trending in gaming setups 👻")
    baseTips.push("Mechanical keyboards improve gaming performance 👻")
  }
  
  if (query.toLowerCase().includes('bedroom')) {
    baseTips.push("Blackout curtains improve sleep quality 👻")
    baseTips.push("Memory foam mattresses are popular 👻")
  }

  // Add budget-specific tips
  if (settings?.budget < 500) {
    baseTips.push("Great finds under budget coming up 👻")
  } else if (settings?.budget > 2000) {
    baseTips.push("Premium options available in your range 👻")
  }

  // Add style-specific tips
  if (settings?.style === 'Premium') {
    baseTips.push("Looking for premium quality items 👻")
  } else if (settings?.style === 'Casual') {
    baseTips.push("Finding great value options 👻")
  }

  return baseTips
}
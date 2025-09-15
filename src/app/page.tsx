'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { SearchSettings } from '@/types'
import { SearchInput } from '@/components/ui/search-input'
import { Navbar } from '@/components/ui/navbar'
import SplitText from '@/components/ui/split-text'

const RippleGrid = dynamic(() => import('@/components/ui/ripple-grid'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 w-full h-full opacity-60" />
})

const DEFAULT_SETTINGS: SearchSettings = {
  style: 'Premium',
  budget: 1000,
  currency: 'USD',
  amazonOnly: false
}

export default function Home() {
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSearch = async (query: string, searchSettings: SearchSettings) => {
    setIsLoading(true)

    try {
      // Create URL with search parameters
      const params = new URLSearchParams({
        q: query,
        style: searchSettings.style,
        budget: searchSettings.budget.toString(),
        currency: searchSettings.currency,
        region: searchSettings.region || 'US',
        amazonOnly: searchSettings.amazonOnly.toString()
      })

      // Navigate to results page
      router.push(`/results?${params.toString()}`)
    } catch (error) {
      console.error('Search error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card">
      {/* Navigation */}
      <Navbar
        settings={settings}
        onSettingsChange={setSettings}
        isSearching={isLoading}
        onSearch={handleSearch}
      />

      {/* Background Pattern */}
      <div className="relative">
        <RippleGrid
          enableRainbow={false}
          gridColor="#ffffff"
          rippleIntensity={0.05}
          gridSize={10}
          gridThickness={15}
          mouseInteraction={true}
          mouseInteractionRadius={1.2}
          opacity={0.8}
          className="opacity-50"
        />

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 py-8">
            <SplitText
              text="What would you like to search?"
              tag="h1"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-8 tracking-tight font-coiny"
              delay={100}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: -40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
              onLetterAnimationComplete={() => {
                console.log('All letters have animated!');
              }}
            />
          </div>

          {/* Search Interface */}
          <div className="w-full max-w-2xl mb-8">
            <SearchInput
              onSearch={handleSearch}
              settings={settings}
              onSettingsChange={setSettings}
              isLoading={isLoading}
              className="w-full"
            />
          </div>

          {/* Quick Examples */}
          <div className="text-center mb-12">
            <p className="text-sm text-muted-foreground mb-4">Try searching for:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['gaming setup', 'home office', 'bedroom decor', 'kitchen essentials'].map((example) => (
                <button
                  key={example}
                  onClick={() => handleSearch(example, settings)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-card border border-border rounded-full text-sm text-card-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 p-6 text-center text-sm text-muted-foreground">
          <p>Powered by AI • Built with ❤️ for product discovery</p>
        </footer>
      </div>
    </div>
  )
}

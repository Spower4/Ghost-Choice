'use client'

import { useState, useEffect } from 'react'
import { SearchSettings } from '@/types'
import { Select } from './select'
import SpotlightCard from './spotlight-card'
import { AuthModal } from '../auth/auth-modal'
import { ContactModal } from '../support/contact-modal'
import { ExtensionModal } from '../extension/extension-modal'
import { useAuth } from '@/hooks/use-auth'

interface NavbarProps {
  settings: SearchSettings
  onSettingsChange: (settings: SearchSettings) => void
  isSearching?: boolean
  onSearch?: (query: string, settings: SearchSettings) => void
}

export function Navbar({ settings, onSettingsChange, isSearching = false, onSearch }: NavbarProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isResultsPage, setIsResultsPage] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showContactModal, setShowContactModal] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  
  const { user, isAuthenticated, signOut } = useAuth()

  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      setIsResultsPage(window.location.pathname === '/results')
    }
  }, [])

  const handleSettingChange = (key: keyof SearchSettings, value: any) => {
    const newSettings = {
      ...settings,
      [key]: value
    }
    onSettingsChange(newSettings)

    // If we're on the results page and settings change, trigger a new search
    if (onSearch && typeof window !== 'undefined' && window.location.pathname === '/results') {
      const urlParams = new URLSearchParams(window.location.search)
      const query = urlParams.get('q') || ''
      onSearch(query, newSettings)
    }
  }

  // Currency to region mapping
  const currencyToRegion: Record<string, string> = {
    'USD': 'US',
    'EUR': 'EU',
    'GBP': 'UK',
    'CAD': 'CA',
    'AUD': 'AU',
    'INR': 'IN',
    'JPY': 'JP',
    'CNY': 'CN',
    'BRL': 'BR',
    'MXN': 'MX'
  }

  const handleCurrencyChange = (currency: string) => {
    console.log('Currency change triggered:', currency)
    const region = currencyToRegion[currency] || 'US'
    const newSettings: SearchSettings = {
      ...settings,
      currency: currency as SearchSettings['currency'],
      region
    }
    console.log('New settings:', newSettings)
    onSettingsChange(newSettings)

    // If we're on the results page and settings change, trigger a new search
    if (onSearch && typeof window !== 'undefined' && window.location.pathname === '/results') {
      const urlParams = new URLSearchParams(window.location.search)
      const query = urlParams.get('q') || ''
      console.log('Triggering new search with settings:', newSettings)
      onSearch(query, newSettings)
    }
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 w-full backdrop-blur-sm bg-card/95">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16 w-full">
          {/* Left - Hamburger Menu */}
          <div className="absolute left-0 flex items-center">
            <button
              onClick={() => {
                console.log('Hamburger clicked, current state:', showMobileMenu)
                setShowMobileMenu(!showMobileMenu)
              }}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Center - App Name */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-xl font-bold text-foreground font-coiny">Ghost's Choice</h1>
          </div>

          {/* Right - Chrome Extension & Settings */}
          <div className="absolute right-0 flex items-center space-x-3">
            {/* Chrome Extension Button - Show on all pages for desktop/laptop only */}
            <button 
              onClick={() => setShowExtensionModal(true)}
              className="hidden lg:inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-xs sm:text-sm leading-4 font-medium rounded-2xl text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="hidden sm:inline">Add Extension</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* Settings Button - Mobile/Tablet only */}
            <button
              onClick={() => !isSearching && setShowSettings(!showSettings)}
              disabled={isSearching}
              className={`lg:hidden p-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring ${isSearching
                ? 'text-muted-foreground cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Menu - Responsive for all screen sizes */}
      {showMobileMenu && (
        <div className="absolute left-4 top-16 z-50 w-80 sm:w-96">
          <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.15)" className="bg-card border border-border rounded-3xl shadow-lg">
            <div className="p-4 sm:p-6 space-y-1">
              {/* User Section */}
              <div className="pb-3 border-b border-border mb-3">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-medium text-card-foreground">
                      {isAuthenticated ? user?.name : 'Guest User'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isAuthenticated ? user?.email : 'Not signed in'}
                    </p>
                  </div>
                </div>
                {!isAuthenticated ? (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setShowMobileMenu(false)
                        setAuthMode('signin')
                        setShowAuthModal(true)
                      }}
                      className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-2xl hover:bg-primary/90 transition-colors"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => {
                        setShowMobileMenu(false)
                        setAuthMode('signup')
                        setShowAuthModal(true)
                      }}
                      className="flex-1 px-3 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-2xl hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      Sign Up
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      signOut()
                      setShowMobileMenu(false)
                    }}
                    className="w-full px-3 py-2 bg-destructive/10 text-destructive text-sm font-medium rounded-2xl hover:bg-destructive/20 transition-colors"
                  >
                    Sign Out
                  </button>
                )}
              </div>

              {/* Navigation Items */}
              <div className="space-y-1">
                <a 
                  href="/" 
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center px-3 py-3 text-card-foreground hover:bg-accent rounded-2xl transition-colors group"
                >
                  <svg className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-medium">Home</span>
                </a>

                {/* Saved Lists - Only show for authenticated users */}
                {isAuthenticated && (
                  <a 
                    href="/saved-lists" 
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center px-3 py-3 text-card-foreground hover:bg-accent rounded-2xl transition-colors group"
                  >
                    <svg className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="font-medium">Saved Lists</span>
                  </a>
                )}

                {/* Search History - Only show for authenticated users */}
                {isAuthenticated && (
                  <a 
                    href="/history" 
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center px-3 py-3 text-card-foreground hover:bg-accent rounded-2xl transition-colors group"
                  >
                    <svg className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Search History</span>
                  </a>
                )}

                {/* Analytics - Only show for authenticated users */}
                {isAuthenticated && (
                  <a 
                    href="/analytics" 
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center px-3 py-3 text-card-foreground hover:bg-accent rounded-2xl transition-colors group"
                  >
                    <svg className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">Analytics</span>
                  </a>
                )}

                <button 
                  onClick={() => {
                    setShowMobileMenu(false)
                    setShowContactModal(true)
                  }}
                  className="flex items-center px-3 py-3 text-card-foreground hover:bg-accent rounded-2xl transition-colors group w-full text-left"
                >
                  <svg className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-medium">Contact Support</span>
                </button>
              </div>

              {/* Chrome Extension - Desktop/Laptop only */}
              <div className="hidden lg:block pt-3 border-t border-border mt-3">
                <button 
                  onClick={() => {
                    setShowMobileMenu(false)
                    setShowExtensionModal(true)
                  }}
                  className="w-full flex items-center px-3 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl transition-colors group"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">Add Chrome Extension</div>
                    <div className="text-xs sm:text-sm opacity-75">Get instant product suggestions</div>
                  </div>
                </button>
              </div>
            </div>
          </SpotlightCard>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute right-4 top-16 w-80 z-[60]">
          <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="bg-popover rounded-3xl shadow-lg border border-border">
            <div className="p-4">
            <h3 className="text-lg font-semibold text-popover-foreground mb-4">Search Settings</h3>

            {/* Style */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-popover-foreground mb-2">
                Style
              </label>
              <Select
                value={settings.style}
                onChange={(value) => {
                  console.log('Style changed to:', value);
                  handleSettingChange('style', value);
                }}
                options={[
                  { value: 'Premium', label: 'Premium - High-end brands & quality' },
                  { value: 'Casual', label: 'Casual - Best value for money' }
                ]}
              />
            </div>

            {/* Budget */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-popover-foreground mb-2">
                Budget: ${settings.budget}
              </label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={settings.budget}
                onChange={(e) => handleSettingChange('budget', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$100</span>
                <span>$5000</span>
              </div>
            </div>



            {/* Currency */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-popover-foreground mb-2">
                Currency & Region
              </label>
              <Select
                value={settings.currency}
                onChange={handleCurrencyChange}
                options={[
                  { value: 'USD', label: 'USD ($) - United States' },
                  { value: 'EUR', label: 'EUR (€) - Europe' },
                  { value: 'GBP', label: 'GBP (£) - United Kingdom' },
                  { value: 'CAD', label: 'CAD ($) - Canada' },
                  { value: 'AUD', label: 'AUD ($) - Australia' },
                  { value: 'INR', label: 'INR (₹) - India' },
                  { value: 'JPY', label: 'JPY (¥) - Japan' },
                  { value: 'CNY', label: 'CNY (¥) - China' },
                  { value: 'BRL', label: 'BRL (R$) - Brazil' },
                  { value: 'MXN', label: 'MXN ($) - Mexico' }
                ]}
              />
            </div>

            {/* Amazon Only */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.amazonOnly}
                  onChange={(e) => handleSettingChange('amazonOnly', e.target.checked)}
                  className="rounded border-border text-primary focus:ring-ring accent-primary"
                />
                <span className="ml-2 text-sm text-popover-foreground">Amazon only</span>
              </label>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-2xl hover:bg-primary/90 transition-colors"
            >
              Save Settings
            </button>
          </div>
          </SpotlightCard>
        </div>
      )}

      {/* Overlay to close mobile menu */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Overlay to close settings */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-[45]"
          onClick={(e) => {
            // Don't close if clicking on dropdown options
            if (!(e.target as Element).closest('.z-\\[9999\\]')) {
              setShowSettings(false)
            }
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      {/* Contact Support Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      {/* Extension Installation Modal */}
      <ExtensionModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
      />
    </nav>
  )
}
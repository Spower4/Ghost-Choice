'use client'

import { useState } from 'react'
import { SearchSettings } from '@/types'

interface ToolbarProps {
  settings: SearchSettings
  onSettingsChange: (settings: SearchSettings) => void
  className?: string
}

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$'
} as const

const CURRENCIES = [
  { value: 'USD', label: 'USD ($) - United States', symbol: '$' },
  { value: 'EUR', label: 'EUR (€) - Europe', symbol: '€' },
  { value: 'GBP', label: 'GBP (£) - United Kingdom', symbol: '£' },
  { value: 'CAD', label: 'CAD (C$) - Canada', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$) - Australia', symbol: 'A$' },
  { value: 'INR', label: 'INR (₹) - India', symbol: '₹' },
  { value: 'JPY', label: 'JPY (¥) - Japan', symbol: '¥' },
  { value: 'CNY', label: 'CNY (¥) - China', symbol: '¥' },
  { value: 'BRL', label: 'BRL (R$) - Brazil', symbol: 'R$' },
  { value: 'MXN', label: 'MXN ($) - Mexico', symbol: '$' }
] as const

export function Toolbar({ settings, onSettingsChange, className = '' }: ToolbarProps) {
  const [showSettings, setShowSettings] = useState(false)

  const updateSetting = <K extends keyof SearchSettings>(
    key: K,
    value: SearchSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value
    })
  }

  const formatBudget = (value: number) => {
    const symbol = CURRENCY_SYMBOLS[settings.currency]
    return `${symbol}${value.toLocaleString()}`
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      {/* Main Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Section - Style & Results Mode */}
        <div className="flex items-center space-x-4">
          {/* Style Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Style:</span>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => updateSetting('style', 'Premium')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  settings.style === 'Premium'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Premium
              </button>
              <button
                onClick={() => updateSetting('style', 'Casual')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  settings.style === 'Casual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Casual
              </button>
            </div>
          </div>

          {/* Results Mode */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Results:</span>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => updateSetting('resultsMode', 'Single')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  settings.resultsMode === 'Single'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => updateSetting('resultsMode', 'Multiple')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  settings.resultsMode === 'Multiple'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Multiple
              </button>
            </div>
          </div>
        </div>

        {/* Right Section - Budget & Settings */}
        <div className="flex items-center space-x-4">
          {/* Budget Display */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Budget:</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatBudget(settings.budget)}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Budget Input */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {CURRENCY_SYMBOLS[settings.currency]}
                </span>
                <input
                  type="number"
                  id="budget"
                  min="0"
                  step="50"
                  value={settings.budget}
                  onChange={(e) => updateSetting('budget', Number(e.target.value))}
                  className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="1000"
                />
              </div>
            </div>

            {/* Currency Selection */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                id="currency"
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value as SearchSettings['currency'])}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>



            {/* Amazon Only Toggle */}
            <div>
              <label htmlFor="amazon-only" className="block text-sm font-medium text-gray-700 mb-1">
                Amazon Only
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => updateSetting('amazonOnly', !settings.amazonOnly)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.amazonOnly ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={settings.amazonOnly}
                  aria-labelledby="amazon-only"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.amazonOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm text-gray-600">
                  {settings.amazonOnly ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
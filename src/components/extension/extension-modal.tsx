'use client'

import { useState } from 'react'
import SpotlightCard from '../ui/spotlight-card'

interface ExtensionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExtensionModal({ isOpen, onClose }: ExtensionModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  if (!isOpen) return null

  const steps = [
    {
      title: "Download Extension",
      description: "Get the Ghost's Choice Chrome extension",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-2xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Extension Package</h4>
                <p className="text-sm text-blue-700">Chrome extension files ready to install</p>
              </div>
            </div>
            <a
              href="/chrome-extension.zip"
              download="ghost-choice-extension.zip"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Extension
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Download and extract the extension files to a folder on your computer.
          </p>
        </div>
      )
    },
    {
      title: "Enable Developer Mode",
      description: "Allow Chrome to install unpacked extensions",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Open Chrome Extensions</p>
                <p className="text-xs text-muted-foreground">Go to chrome://extensions/ or Menu → Extensions → Manage Extensions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Enable Developer Mode</p>
                <p className="text-xs text-muted-foreground">Toggle the "Developer mode" switch in the top right corner</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs text-amber-800">Developer mode is required to install unpacked extensions</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Install Extension",
      description: "Load the Ghost's Choice extension into Chrome",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Click "Load unpacked"</p>
                <p className="text-xs text-muted-foreground">Button appears after enabling Developer mode</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Select Extension Folder</p>
                <p className="text-xs text-muted-foreground">Choose the extracted chrome-extension folder</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Pin Extension</p>
                <p className="text-xs text-muted-foreground">Click the puzzle icon and pin Ghost's Choice for easy access</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-xl border border-green-200">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs text-green-800">Extension will appear in your Chrome toolbar when installed</p>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-lg mx-auto my-auto">
        <SpotlightCard 
          spotlightColor="rgba(139, 92, 246, 0.15)" 
          className="bg-card border border-border rounded-3xl shadow-xl relative"
        >
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-card-foreground mb-2 font-coiny">
                Install Chrome Extension
              </h2>
              <p className="text-muted-foreground">
                Get instant product recommendations right from your browser
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              {steps.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index + 1 <= currentStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      index + 1 < currentStep ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Current Step Content */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-2 font-coiny">
                Step {currentStep}: {steps[currentStep - 1].title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {steps[currentStep - 1].description}
              </p>
              {steps[currentStep - 1].content}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {currentStep < steps.length ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-2xl hover:bg-primary/90 transition-colors"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-2xl hover:bg-green-700 transition-colors"
                >
                  Done
                </button>
              )}
            </div>

            {/* Features Preview */}
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-card-foreground mb-3">Extension Features:</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted-foreground">Quick search popup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted-foreground">Customizable settings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted-foreground">Instant results</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted-foreground">Direct product links</span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}
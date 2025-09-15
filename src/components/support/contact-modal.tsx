'use client'

import { useState } from 'react'
import SpotlightCard from '../ui/spotlight-card'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issue: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSuccess(true)
        setFormData({ name: '', email: '', issue: '' })
        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send message')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', issue: '' })
    setError('')
    setSuccess(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-sm mx-auto my-auto">
        <SpotlightCard 
          spotlightColor="rgba(139, 92, 246, 0.15)" 
          className="bg-card border border-border rounded-3xl shadow-xl relative"
        >
          <div className="p-4">
            {!success ? (
              <>
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-card-foreground mb-1 font-coiny">
                    Contact Support
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Having an issue? Let us know and we'll help.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-sm"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Describe Your Issue
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.issue}
                      onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground resize-none text-sm"
                      placeholder="Please describe the issue..."
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-2xl">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-2xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-card-foreground mb-1 font-coiny">
                    Message Sent!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Thank you for contacting us. We'll get back to you soon.
                  </p>
                </div>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={handleClose}
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
'use client'

import { useState } from 'react'
import SpotlightCard from '../ui/spotlight-card'
import { SignUpData, SignInData } from '@/types/auth'
// Dynamic import for EmailJS to handle potential errors

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup' | 'reset'
  onModeChange: (mode: 'signin' | 'signup' | 'reset') => void
}

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showOTP, setShowOTP] = useState(false)
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showResetOTP, setShowResetOTP] = useState(false)
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }

        // First, create the account and get OTP from server
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          } as SignUpData)
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.configError && data.otp) {
            // Gmail not configured
            console.log('🔐 Gmail Not Configured - Your OTP code:', data.otp)
            console.log('⚙️ Config Info:', data.configInfo)
          } else if (data.emailError && data.otp) {
            // Email failed, show OTP in console as fallback
            console.log('🔐 Email failed, your OTP code:', data.otp)
            console.log('⚠️ Email delivery failed, but you can still verify with the OTP above')
          } else {
            console.log('✅ Verification email sent successfully!')
          }
          
          setShowOTP(true)
        } else {
          const data = await response.json()
          setError(data.error || 'Sign up failed')
        }
      } else {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          } as SignInData)
        })

        if (response.ok) {
          const data = await response.json()
          // Store auth data in localStorage
          if (data.token && data.user) {
            localStorage.setItem('ghost_auth_token', data.token)
            localStorage.setItem('ghost_user', JSON.stringify(data.user))
          }
          onClose()
          window.location.reload() // Refresh to update auth state
        } else {
          const data = await response.json()
          setError(data.error || 'Sign in failed')
        }
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: otp
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Store auth data in localStorage
        if (data.token && data.user) {
          localStorage.setItem('ghost_auth_token', data.token)
          localStorage.setItem('ghost_user', JSON.stringify(data.user))
        }
        onClose()
        window.location.reload() // Refresh to update auth state
      } else {
        const data = await response.json()
        setError(data.error || 'OTP verification failed')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '' })
    setError('')
    setShowOTP(false)
    setOtp('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowResetOTP(false)
    setResetStep('email')
  }

  const handleModeSwitch = (newMode: 'signin' | 'signup' | 'reset') => {
    resetForm()
    onModeChange(newMode)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (resetStep === 'email') {
        // Send reset OTP
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        })

        if (response.ok) {
          const data = await response.json()
          console.log('🔐 Password Reset OTP:', data.otp || 'Check your email')
          setResetStep('otp')
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to send reset code')
        }
      } else if (resetStep === 'otp') {
        // Verify reset OTP
        const response = await fetch('/api/auth/verify-reset-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, otp })
        })

        if (response.ok) {
          setResetStep('password')
        } else {
          const data = await response.json()
          setError(data.error || 'Invalid or expired code')
        }
      } else if (resetStep === 'password') {
        // Reset password
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }

        const response = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            otp, 
            newPassword: formData.password 
          })
        })

        if (response.ok) {
          // Password reset successful, switch to signin
          resetForm()
          handleModeSwitch('signin')
          setError('')
          // Show success message briefly
          setTimeout(() => {
            setError('Password reset successful! Please sign in with your new password.')
          }, 100)
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to reset password')
        }
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-md mx-auto my-auto">
        <SpotlightCard 
          spotlightColor="rgba(139, 92, 246, 0.15)" 
          className="bg-card border border-border rounded-3xl shadow-xl relative"
        >
          <div className="p-6">
            {!showOTP ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-card-foreground mb-2 font-coiny">
                    {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                  </h2>
                  <p className="text-muted-foreground">
                    {mode === 'signin' 
                      ? 'Sign in to access your saved lists and preferences' 
                      : mode === 'signup'
                      ? 'Join Ghost\'s Choice to save your favorite setups'
                      : resetStep === 'email' 
                        ? 'Enter your email to receive a reset code'
                        : resetStep === 'otp'
                        ? 'Enter the verification code sent to your email'
                        : 'Enter your new password'
                    }
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={mode === 'reset' ? handlePasswordReset : handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                        placeholder="Enter your full name"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      placeholder="Enter your email"
                    />
                  </div>

                  {/* Only show password field for signin and signup, not reset */}
                  {mode !== 'reset' && (
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                          placeholder="Enter your password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="m2 2 20 20" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                          placeholder="Confirm your password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          {showConfirmPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="m2 2 20 20" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reset Password Fields */}
                  {mode === 'reset' && resetStep === 'otp' && (
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-center text-2xl tracking-widest"
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                  )}

                  {mode === 'reset' && resetStep === 'password' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                            placeholder="Enter new password"
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          >
                            {showPassword ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                <path d="m2 2 20 20" />
                                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                            placeholder="Confirm new password"
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          >
                            {showConfirmPassword ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                <path d="m2 2 20 20" />
                                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-2xl">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (mode === 'reset' && resetStep === 'otp' && otp.length !== 6)}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        <span>
                          {mode === 'signin' ? 'Signing In...' : 
                           mode === 'signup' ? 'Creating Account...' :
                           resetStep === 'email' ? 'Sending Code...' :
                           resetStep === 'otp' ? 'Verifying...' :
                           'Updating Password...'}
                        </span>
                      </div>
                    ) : (
                      mode === 'signin' ? 'Sign In' : 
                      mode === 'signup' ? 'Create Account' :
                      resetStep === 'email' ? 'Send Reset Code' :
                      resetStep === 'otp' ? 'Verify Code' :
                      'Update Password'
                    )}
                  </button>
                </form>

                {/* Forgot Password Link - Only show in signin mode */}
                {mode === 'signin' && (
                  <div className="text-center mt-4">
                    <button
                      onClick={() => handleModeSwitch('reset')}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                {/* Mode Switch */}
                <div className="text-center mt-6 pt-4 border-t border-border">
                  <p className="text-muted-foreground">
                    {mode === 'signin' ? "Don't have an account?" : mode === 'signup' ? "Already have an account?" : "Remember your password?"}
                    <button
                      onClick={() => handleModeSwitch(mode === 'signin' ? 'signup' : 'signin')}
                      className="ml-2 text-primary hover:text-primary/80 font-medium"
                    >
                      {mode === 'signin' ? 'Sign Up' : mode === 'signup' ? 'Sign In' : 'Sign In'}
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* OTP Verification */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-card-foreground mb-2 font-coiny">
                    Verify Your Email
                  </h2>
                  <p className="text-muted-foreground">
                    We've sent a 6-digit code to <span className="font-medium">{formData.email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    📧 Check your email inbox for the verification code
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    💡 If email doesn't arrive, check browser console (F12) for OTP
                  </p>
                </div>

                <form onSubmit={handleOTPVerification} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-2xl">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      'Verify Email'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOTP(false)}
                    className="w-full text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to Sign Up
                  </button>
                </form>
              </>
            )}

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
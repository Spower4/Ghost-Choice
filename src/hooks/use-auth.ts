'use client'

import { useState, useEffect } from 'react'
import { AuthState, User } from '@/types/auth'
import { AuthService } from '@/lib/auth'

export function useAuth(): AuthState & {
  signOut: () => void
  refreshAuth: () => void
} {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  })

  const refreshAuth = () => {
    const user = AuthService.getUser()
    const isAuthenticated = AuthService.isAuthenticated()
    
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated
    })
  }

  const signOut = () => {
    AuthService.clearAuth()
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false
    })
  }

  useEffect(() => {
    refreshAuth()
  }, [])

  return {
    ...authState,
    signOut,
    refreshAuth
  }
}
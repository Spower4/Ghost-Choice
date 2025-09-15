export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  isVerified: boolean
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface SignUpData {
  name: string
  email: string
  password: string
}

export interface SignInData {
  email: string
  password: string
}

export interface OTPVerificationData {
  email: string
  otp: string
}
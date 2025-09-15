// Shared in-memory storage (replace with actual database in production)

export const users: Array<{
  id: string
  email: string
  name: string
  password: string
  isVerified: boolean
  createdAt: Date
}> = []

export const otpStorage: Map<string, { 
  otp: string; 
  expiresAt: Date; 
  userData: any 
}> = new Map()
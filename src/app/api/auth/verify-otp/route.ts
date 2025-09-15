import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { OTPVerificationData } from '@/types/auth'
import { users, otpStorage } from '@/lib/storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, otp }: OTPVerificationData = await request.json()

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    // Get OTP data
    const otpData = otpStorage.get(email)
    console.log(`🔍 Looking for OTP for email: ${email}`)
    console.log(`🔍 OTP Storage has ${otpStorage.size} entries`)
    console.log(`🔍 Found OTP data:`, otpData ? 'Yes' : 'No')
    
    if (!otpData) {
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      otpStorage.delete(email)
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      )
    }

    // Verify OTP
    console.log(`🔍 Comparing OTPs - Stored: ${otpData.otp}, Provided: ${otp}`)
    if (otpData.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      )
    }

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newUser = {
      id: userId,
      email: otpData.userData.email,
      name: otpData.userData.name,
      password: otpData.userData.password,
      isVerified: true,
      createdAt: new Date()
    }

    users.push(newUser)

    // Clean up OTP
    otpStorage.delete(email)

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return user data (without password)
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
      isVerified: newUser.isVerified
    }

    return NextResponse.json(
      { 
        message: 'Email verified successfully',
        user: userResponse,
        token 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('OTP verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
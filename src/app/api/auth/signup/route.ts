import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { SignUpData } from '@/types/auth'
import { sendOTPEmail } from '@/lib/email'
import { users, otpStorage } from '@/lib/storage'

// EmailJS now handled client-side

export async function POST(request: NextRequest) {
  try {
    const { name, email, password }: SignUpData = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Store OTP and user data temporarily
    otpStorage.set(email, {
      otp,
      expiresAt,
      userData: {
        name,
        email,
        password: hashedPassword
      }
    })

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, name)
      console.log(`✅ OTP email sent to ${email}`)
      
      return NextResponse.json(
        { 
          message: 'Account created! Please check your email for the verification code.',
          success: true
        },
        { status: 200 }
      )
    } catch (emailError: any) {
      console.error('Failed to send OTP email:', emailError)
      
      // Check if it's a configuration error
      if (emailError.message?.includes('Gmail credentials not configured')) {
        console.log(`🔐 Gmail not configured - OTP for ${email}: ${otp}`)
        
        return NextResponse.json(
          { 
            message: 'Account created! Gmail not configured - check console for OTP.',
            otp: otp, // Show OTP for development
            configError: true,
            configInfo: 'Please configure Gmail credentials in your .env.local file.'
          },
          { status: 200 }
        )
      }
      
      // Other email errors - fallback
      console.log(`🔐 Email failed, OTP for ${email}: ${otp}`)
      
      return NextResponse.json(
        { 
          message: 'Account created, but email delivery failed. Your OTP is provided below.',
          otp: otp, // Fallback for development
          emailError: true
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
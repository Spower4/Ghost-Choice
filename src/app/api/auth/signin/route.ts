import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { SignInData } from '@/types/auth'
import { users } from '@/lib/storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password }: SignInData = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = users.find(u => u.email === email)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is verified
    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'Please verify your email first' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return user data (without password)
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      isVerified: user.isVerified
    }

    return NextResponse.json(
      { 
        message: 'Sign in successful',
        user: userResponse,
        token 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
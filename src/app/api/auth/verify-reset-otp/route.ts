import { NextRequest, NextResponse } from 'next/server'
import { resetOtpStorage } from '../reset-password/route'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    // Check if reset OTP exists and is valid
    const resetData = resetOtpStorage.get(email)
    if (!resetData) {
      return NextResponse.json(
        { error: 'No reset request found for this email' },
        { status: 404 }
      )
    }

    // Check if OTP has expired
    if (new Date() > resetData.expiresAt) {
      resetOtpStorage.delete(email)
      return NextResponse.json(
        { error: 'Reset code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (resetData.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid reset code' },
        { status: 400 }
      )
    }

    // OTP is valid - don't delete it yet, we need it for password update
    return NextResponse.json(
      { 
        message: 'Reset code verified successfully',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Reset OTP verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
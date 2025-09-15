import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/storage'
import { resetOtpStorage } from '../reset-password/route'

export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json()

    // Validate input
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Email, OTP, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
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

    // Find user
    const userIndex = users.findIndex(u => u.email === email)
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user password
    users[userIndex].password = hashedPassword

    // Clean up reset OTP
    resetOtpStorage.delete(email)

    return NextResponse.json(
      { 
        message: 'Password updated successfully',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
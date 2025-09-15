import { NextRequest, NextResponse } from 'next/server'
import { users } from '@/lib/storage'
import { sendOTPEmail } from '@/lib/email'

// In-memory storage for reset OTPs
const resetOtpStorage: Map<string, { otp: string; expiresAt: Date }> = new Map()

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === email)
    if (!existingUser) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      )
    }

    // Generate reset OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store reset OTP
    resetOtpStorage.set(email, { otp, expiresAt })

    // Send reset OTP email
    try {
      await sendOTPEmail(email, otp, existingUser.name)
      console.log(`✅ Password reset OTP sent to ${email}`)
      
      return NextResponse.json(
        { 
          message: 'Password reset code sent to your email',
          success: true
        },
        { status: 200 }
      )
    } catch (emailError: any) {
      console.error('Failed to send reset OTP email:', emailError)
      
      // Fallback: return OTP in response for development
      console.log(`🔐 Email failed, reset OTP for ${email}: ${otp}`)
      
      return NextResponse.json(
        { 
          message: 'Password reset code generated (email delivery failed)',
          otp: otp, // Fallback for development
          emailError: true
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export the reset OTP storage for use in other routes
export { resetOtpStorage }
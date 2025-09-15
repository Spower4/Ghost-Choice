import { NextRequest, NextResponse } from 'next/server'

interface ContactData {
  name: string
  email: string
  issue: string
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, issue }: ContactData = await request.json()

    // Validate input
    if (!name || !email || !issue) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Get Telegram configuration
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.error('Telegram configuration missing')
      return NextResponse.json(
        { error: 'Support system not configured' },
        { status: 500 }
      )
    }

    // Format the message
    const currentDate = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const message = `🆘 *New Support Request*

📅 *Date:* ${currentDate} UTC
👤 *Name:* ${name}
📧 *Email:* ${email}

💬 *Issue Description:*
${issue}

---
*Ghost's Choice Support System*`

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram API error:', errorData)
      
      // Fallback: Log to console for development
      console.log('📧 Support Request (Telegram failed):')
      console.log(`Date: ${currentDate}`)
      console.log(`Name: ${name}`)
      console.log(`Email: ${email}`)
      console.log(`Issue: ${issue}`)
      
      return NextResponse.json(
        { 
          message: 'Message received! We will get back to you soon.',
          success: true,
          fallback: true
        },
        { status: 200 }
      )
    }

    console.log(`✅ Support request sent to Telegram from ${email}`)

    return NextResponse.json(
      { 
        message: 'Message sent successfully! We will get back to you soon.',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Contact support error:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
}
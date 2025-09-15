import nodemailer from 'nodemailer'

// Create Gmail transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
}

export async function sendOTPEmail(email: string, otp: string, name: string) {
  try {
    // Validate environment variables
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your .env.local file.')
    }

    const transporter = createTransporter()

    // Verify connection
    await transporter.verify()

    const mailOptions = {
      from: `"Ghost Setup Finder" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Ghost Setup Finder - Account Verification',
      html: `
        <!doctype html>
        <html lang="en" style="margin:0;padding:0">
        <head>
          <meta charset="utf-8">
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Ghost Setup Finder OTP</title>
          <style>
            /* Basic reset for email clients */
            body { margin:0; padding:0; background:#f6f7fb; color:#141414; -webkit-font-smoothing:antialiased; }
            table { border-collapse:collapse; width:100%; }
            a { color:#5b6cff; text-decoration:none; }
            /* Card */
            .wrap { width:100%; padding:24px 0; }
            .card {width:100%; max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; box-shadow:0 6px 30px rgba(17,17,26,.08); overflow:hidden; border:1px solid #eceef3;}
            .header { padding:20px 24px; border-bottom:1px solid #edf0f6; display:flex; align-items:center; gap:12px; }
            .logo { width:28px; height:28px; border-radius:6px; background:#101216; display:inline-block; }
            .brand { font:600 16px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#101216; }
            .body { padding:28px 24px 8px; font:400 15px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
            .title { margin:0 0 8px; font-weight:700; font-size:20px; color:#101216; }
            .muted { color:#5f6677; }
            .otp {letter-spacing:.28em; font:700 28px/1.1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;padding:16px 18px; text-align:center; background:#f3f6ff; color:#1d2cff; border-radius:12px; border:1px dashed #cfd7ff;margin:18px 0 10px;}
            .hint { font-size:13px; color:#777e8e; }
            .cta {display:inline-block; margin:18px 0 6px; padding:12px 18px; border-radius:12px;background:#1d2cff; color:#fff !important; font-weight:600;}
            .foot { padding:18px 24px 24px; color:#7b8396; font:400 13px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
            .foot a { color:#7b83ff; }
            @media (prefers-color-scheme: dark) {
              body { background:#0b0d12; color:#e7e9ee; }
              .card { background:#121520; border-color:#1c2230; box-shadow:none; }
              .header { border-color:#1c2230; }
              .brand, .title { color:#e7eaf3; }
              .muted { color:#a7b0c4; }
              .otp { background:#0e1530; color:#c7d2ff; border-color:#2a3866; }
              .hint, .foot { color:#98a3ba; }
              .cta { background:#4657ff; }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <table role="presentation" aria-hidden="true">
              <tr>
                <td>
                  <div class="card">
                    <div class="header">
                      <span class="logo">👻</span>
                      <span class="brand">Ghost Setup Finder</span>
                    </div>
                    <div class="body">
                      <h1 class="title">Account verification</h1>
                      <p class="muted">Hi ${name}, use this code to complete your signup on <strong>Ghost Setup Finder</strong>.</p>
                      <div class="otp">${otp}</div>
                      <p class="hint">This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this message.</p>
                    </div>
                    <div class="foot">
                      Need help? Email <a href="mailto:${process.env.GMAIL_USER}">support</a>.<br>
                      © ${new Date().getFullYear()} Ghost Setup Finder. All rights reserved.
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name}!
        
        Welcome to Ghost Setup Finder! 
        
        Your account verification code is: ${otp}
        
        This code expires in 10 minutes.
        
        If you didn't request this, you can safely ignore this email.
        
        Ghost Setup Finder Team
      `
    }

    const info = await transporter.sendMail(mailOptions)
    
    return { success: true, messageId: info.messageId }
    
  } catch (error: any) {
    throw error
  }
}
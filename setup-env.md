# Environment Variables Setup for Vercel

## Quick Setup Instructions

1. Go to your Vercel dashboard: https://vercel.com/shreyaz-123u/ghost-setup-finder
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar
4. Add each of these variables:

## Required Environment Variables

```
GEMINI_API_KEY=AIzaSyC3cenuEe11goKFrEbqiovPM0jF5QSShHY
GEMINI_TEXT_MODEL=gemini-2.0-flash
SERPAPI_KEY=13a09c278849d2acc82b8da56fa3e8b9dad7379bf20abedb16c44acd11435d82
UPSTASH_REDIS_REST_URL=https://crack-moray-62262.upstash.io
UPSTASH_REDIS_REST_TOKEN=AfM2AAIncDFmN2UxMzBhMjYwMTQ0ZGNkODJiN2E2YTA5YzQ1OTUxOHAxNjIyNjI
NEXT_PUBLIC_APP_URL=https://ghost-setup-finder-favb0htu3-shreyaz-123u.vercel.app
NEXT_TELEMETRY_DISABLED=1
GMAIL_USER=noreply.ghostchoice@gmail.com
GMAIL_APP_PASSWORD=roqohcfpplughpop
JWT_SECRET=6b79ad951e7559bd71b31e2b7258def0
TELEGRAM_BOT_TOKEN=8207586998:AAG6lubGHNjVzzKIAsTFcMDQ5tMQKAI94Bs
TELEGRAM_CHAT_ID=6863340380
```

## After Adding Variables

1. Go back to the **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or run `vercel --prod` from your terminal

## Important Notes

- Make sure to set the environment for **Production**, **Preview**, and **Development**
- The `NEXT_PUBLIC_APP_URL` should match your current Vercel domain
- After adding variables, you MUST redeploy for them to take effect
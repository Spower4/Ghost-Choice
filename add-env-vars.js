#!/usr/bin/env node

const { execSync } = require('child_process');

const envVars = {
  'GEMINI_API_KEY': 'AIzaSyC3cenuEe11goKFrEbqiovPM0jF5QSShHY',
  'GEMINI_TEXT_MODEL': 'gemini-2.0-flash',
  'SERPAPI_KEY': '13a09c278849d2acc82b8da56fa3e8b9dad7379bf20abedb16c44acd11435d82',
  'UPSTASH_REDIS_REST_URL': 'https://crack-moray-62262.upstash.io',
  'UPSTASH_REDIS_REST_TOKEN': 'AfM2AAIncDFmN2UxMzBhMjYwMTQ0ZGNkODJiN2E2YTA5YzQ1OTUxOHAxNjIyNjI',
  'NEXT_PUBLIC_APP_URL': 'https://ghost-setup-finder-favb0htu3-shreyaz-123u.vercel.app',
  'NEXT_TELEMETRY_DISABLED': '1',
  'GMAIL_USER': 'noreply.ghostchoice@gmail.com',
  'GMAIL_APP_PASSWORD': 'roqohcfpplughpop',
  'JWT_SECRET': '6b79ad951e7559bd71b31e2b7258def0',
  'TELEGRAM_BOT_TOKEN': '8207586998:AAG6lubGHNjVzzKIAsTFcMDQ5tMQKAI94Bs',
  'TELEGRAM_CHAT_ID': '6863340380'
};

console.log('Adding environment variables to Vercel...');

Object.entries(envVars).forEach(([key, value]) => {
  try {
    execSync(`vercel env add ${key} production`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log(`✅ Added ${key}`);
  } catch (error) {
    console.log(`⚠️  ${key} might already exist or failed to add`);
  }
});

console.log('\n🚀 Redeploying with new environment variables...');
execSync('vercel --prod', { stdio: 'inherit' });
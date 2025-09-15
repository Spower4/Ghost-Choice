#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel deployment...\n');

// Check if vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'ignore' });
} catch (error) {
  console.log('📦 Installing Vercel CLI...');
  execSync('npm install -g vercel', { stdio: 'inherit' });
}

// Read environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

console.log('🔧 Environment variables found:');
Object.keys(envVars).forEach(key => {
  console.log(`   ${key}=${key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD') ? '[HIDDEN]' : envVars[key]}`);
});

console.log('\n📋 Next steps:');
console.log('1. Run: vercel');
console.log('2. Follow the prompts to link your project');
console.log('3. Set environment variables in Vercel dashboard');
console.log('4. Deploy with: vercel --prod');

console.log('\n🌐 After deployment, update NEXT_PUBLIC_APP_URL to your Vercel domain');
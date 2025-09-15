const fs = require('fs');
const path = require('path');

// This script helps convert a GIF to PNG icons
// You'll need to manually convert the GIF to PNG first, then run this script

const iconSizes = [16, 32, 48, 128];
const iconDir = path.join(__dirname, '../chrome-extension/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

console.log('📝 Instructions to create PNG icons from your GIF:');
console.log('');
console.log('1. Convert your 50x50 GIF to PNG format using:');
console.log('   - Online tools: https://convertio.co/gif-png/');
console.log('   - Photoshop/GIMP: Export as PNG');
console.log('   - Command line: ffmpeg -i your-gif.gif frame.png');
console.log('');
console.log('2. Resize the PNG to these sizes and save in chrome-extension/icons/:');
iconSizes.forEach(size => {
  console.log(`   - icon${size}.png (${size}x${size} pixels)`);
});
console.log('');
console.log('3. After creating the PNG files, run: npm run build:extension');
console.log('');
console.log('💡 Tip: Use online tools like:');
console.log('   - https://www.iloveimg.com/resize-image');
console.log('   - https://imageresizer.com/');
console.log('   - https://www.canva.com/');

// Check if any PNG icons already exist
const existingIcons = iconSizes.filter(size => {
  return fs.existsSync(path.join(iconDir, `icon${size}.png`));
});

if (existingIcons.length > 0) {
  console.log('');
  console.log('✅ Found existing PNG icons:');
  existingIcons.forEach(size => {
    console.log(`   - icon${size}.png`);
  });
} else {
  console.log('');
  console.log('❌ No PNG icons found in chrome-extension/icons/');
}
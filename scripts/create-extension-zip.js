const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create chrome-extension.zip in public folder
const output = fs.createWriteStream(path.join(publicDir, 'chrome-extension.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', function() {
  console.log('✅ Chrome extension packaged successfully!');
  console.log(`📦 Archive size: ${archive.pointer()} bytes`);
  console.log('📁 Location: public/chrome-extension.zip');
  console.log('🌐 Available at: /chrome-extension.zip');
});

archive.on('error', function(err) {
  console.error('❌ Error creating extension package:', err);
  throw err;
});

archive.pipe(output);

// Add all files from chrome-extension directory
const extensionDir = path.join(__dirname, '../chrome-extension');

// Check if extension directory exists
if (!fs.existsSync(extensionDir)) {
  console.error('❌ Chrome extension directory not found:', extensionDir);
  process.exit(1);
}

// Add files individually to maintain structure
const filesToAdd = [
  'manifest.json',
  'popup.html', 
  'popup.css',
  'popup.js',
  'README.md'
];

filesToAdd.forEach(file => {
  const filePath = path.join(extensionDir, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
    console.log(`📄 Added: ${file}`);
  } else {
    console.log(`⚠️  Warning: ${file} not found`);
  }
});

// Check for PNG icons
const iconDir = path.join(extensionDir, 'icons');
const iconSizes = [16, 32, 48, 128];
const missingIcons = [];

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Check which PNG icons are missing
iconSizes.forEach(size => {
  const iconPath = path.join(iconDir, `icon${size}.png`);
  if (!fs.existsSync(iconPath)) {
    missingIcons.push(size);
  }
});

if (missingIcons.length > 0) {
  console.log('⚠️  Warning: Missing PNG icons for sizes:', missingIcons.join(', '));
  console.log('💡 Run: node scripts/convert-gif-to-icons.js for instructions');
  console.log('📝 Chrome extensions require PNG icons, not GIF or SVG');
}

// Add icons directory
if (fs.existsSync(iconDir)) {
  archive.directory(iconDir, 'icons');
  console.log('📁 Added: icons directory');
}

// Add the source SVG icon
const svgIcon = path.join(extensionDir, 'icon.svg');
if (fs.existsSync(svgIcon)) {
  archive.file(svgIcon, { name: 'icon.svg' });
  console.log('📄 Added: icon.svg');
}

archive.finalize();
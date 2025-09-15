const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create chrome-extension.zip in public folder
const output = fs.createWriteStream(path.join(__dirname, '../public/chrome-extension.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', function() {
  console.log('✅ Chrome extension packaged successfully!');
  console.log(`📦 Archive size: ${archive.pointer()} bytes`);
  console.log('📁 Location: public/chrome-extension.zip');
});

archive.on('error', function(err) {
  console.error('❌ Error creating extension package:', err);
  throw err;
});

archive.pipe(output);

// Add all files from chrome-extension directory
const extensionDir = path.join(__dirname, '../chrome-extension');

// Add files individually to maintain structure
archive.file(path.join(extensionDir, 'manifest.json'), { name: 'manifest.json' });
archive.file(path.join(extensionDir, 'popup.html'), { name: 'popup.html' });
archive.file(path.join(extensionDir, 'popup.css'), { name: 'popup.css' });
archive.file(path.join(extensionDir, 'popup.js'), { name: 'popup.js' });
archive.file(path.join(extensionDir, 'README.md'), { name: 'README.md' });

// Add icon files if they exist
const iconDir = path.join(extensionDir, 'icons');
if (fs.existsSync(iconDir)) {
  archive.directory(iconDir, 'icons');
} else {
  console.log('⚠️  Warning: Icons directory not found. Please create PNG icons from icon.svg');
  console.log('   Required: icons/icon16.png, icons/icon32.png, icons/icon48.png, icons/icon128.png');
}

archive.finalize();
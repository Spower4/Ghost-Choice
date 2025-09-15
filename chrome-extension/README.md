# Ghost's Choice Chrome Extension

A Chrome extension that provides instant AI-powered product recommendations directly from your browser.

## Features

- 🔍 **Quick Search**: Search for products without leaving your current page
- ⚙️ **Customizable Settings**: Set your preferred style, budget, currency, and filters
- 📱 **Compact Results**: View top 5 results in a clean, compact format
- 🔗 **Direct Links**: Click any product to open it in a new tab
- 🌐 **Full Results**: Access complete results on the main website

## Installation

### Method 1: Load Unpacked Extension (Development)

1. **Prepare Icons** (Required):
   - Convert the provided `icon.svg` to PNG format in these sizes:
     - `icons/icon16.png` (16x16px)
     - `icons/icon32.png` (32x32px) 
     - `icons/icon48.png` (48x48px)
     - `icons/icon128.png` (128x128px)
   - You can use online tools like [CloudConvert](https://cloudconvert.com/svg-to-png) or design software

2. **Update API URL**:
   - Open `popup.js`
   - Change `API_BASE_URL` from `http://localhost:3000` to your production URL

3. **Load Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension should now appear in your extensions list

### Method 2: Chrome Web Store (Production)

*Coming soon - extension will be published to Chrome Web Store*

## Usage

1. **Click the Extension Icon**: Look for the Ghost's Choice icon in your Chrome toolbar
2. **Enter Search Query**: Type what you're looking for (e.g., "gaming laptop", "wireless headphones")
3. **Adjust Settings** (Optional):
   - **Style**: Premium (high-end) or Casual (value-focused)
   - **Budget**: Set your price range with the slider
   - **Currency**: Choose your preferred currency
   - **Amazon Only**: Toggle to search only Amazon products
4. **Search**: Click the search button or press Enter
5. **View Results**: Browse the top 5 recommendations
6. **Take Action**:
   - Click any product to open it in a new tab
   - Click "View Full Results" to see all results on the main website

## Settings

The extension remembers your preferences:

- **Style**: Premium vs Casual recommendations
- **Budget**: $100 - $5000 range
- **Currency**: USD, EUR, GBP, CAD, AUD, INR, JPY
- **Amazon Only**: Filter to Amazon products only

## API Integration

The extension connects to your Ghost's Choice API:

- **Endpoint**: `/api/build`
- **Method**: POST
- **Authentication**: None required for basic search
- **Rate Limiting**: Follows same limits as web application

## Troubleshooting

### Extension Not Loading
- Ensure all icon files are present in the `icons/` folder
- Check that `manifest.json` is valid JSON
- Verify Chrome Developer Mode is enabled

### Search Not Working
- Check that the API URL in `popup.js` is correct
- Ensure your Ghost's Choice server is running
- Check browser console for error messages
- Verify CORS settings allow extension requests

### No Results Showing
- Confirm API is returning valid product data
- Check network tab for failed requests
- Ensure product data includes required fields (name, price, url)

## Development

### File Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.css             # Styling
├── popup.js              # Main functionality
├── icon.svg              # Source icon (convert to PNG)
├── icons/                # PNG icons (create these)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Customization

**Colors**: Edit the CSS gradient in `popup.css`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**API Endpoint**: Update `API_BASE_URL` in `popup.js`

**Results Limit**: Change the slice parameter in `popup.js`:
```javascript
displayResults(data.products.slice(0, 5)); // Show first 5 results
```

## Security

- Extension only requests permissions for active tab and storage
- No sensitive data is stored locally
- All API communication uses HTTPS in production
- No tracking or analytics included

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Contact support through the main Ghost's Choice website
3. Report bugs via the contact form in the web application
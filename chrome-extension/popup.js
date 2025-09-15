// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change this to your production URL

// DOM Elements
const searchSection = document.getElementById('searchSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const backBtn = document.getElementById('backBtn');
const viewMoreBtn = document.getElementById('viewMoreBtn');
const retryBtn = document.getElementById('retryBtn');

const styleSelect = document.getElementById('styleSelect');
const budgetRange = document.getElementById('budgetRange');
const budgetValue = document.getElementById('budgetValue');
const currencySelect = document.getElementById('currencySelect');
const amazonOnly = document.getElementById('amazonOnly');

const resultsList = document.getElementById('resultsList');
const errorMessage = document.getElementById('errorMessage');

// Loading elements
const loadingSubtext = document.getElementById('loadingSubtext');
const stepText = document.getElementById('stepText');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');

// State
let currentQuery = '';
let currentResults = [];
let loadingSteps = [];
let currentStepIndex = 0;
let loadingInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get({
    style: 'Premium',
    budget: 1000,
    currency: 'USD',
    amazonOnly: false
  }, (items) => {
    styleSelect.value = items.style;
    budgetRange.value = items.budget;
    budgetValue.textContent = items.budget;
    currencySelect.value = items.currency;
    amazonOnly.checked = items.amazonOnly;
  });
}

// Save settings
function saveSettings() {
  const settings = {
    style: styleSelect.value,
    budget: parseInt(budgetRange.value),
    currency: currencySelect.value,
    amazonOnly: amazonOnly.checked
  };
  
  chrome.storage.sync.set(settings);
}

// Setup event listeners
function setupEventListeners() {
  // Search
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  // Navigation
  backBtn.addEventListener('click', showSearchSection);
  retryBtn.addEventListener('click', handleSearch);
  viewMoreBtn.addEventListener('click', openFullResults);

  // Settings
  budgetRange.addEventListener('input', (e) => {
    budgetValue.textContent = e.target.value;
    saveSettings();
  });

  [styleSelect, currencySelect, amazonOnly].forEach(element => {
    element.addEventListener('change', saveSettings);
  });
}

// Generate loading steps based on query
function generateLoadingSteps(query) {
  const lowerQuery = query.toLowerCase();
  
  // Check if this is a single item query
  const isSingleItem = detectSingleItemQuery(lowerQuery);
  
  if (isSingleItem) {
    return [
      'Analyzing your requirements',
      'Searching for best options',
      'Comparing prices & reviews',
      'Finalizing recommendations'
    ];
  }
  
  // Multi-item setup queries
  return [
    'Analyzing your requirements',
    'Identifying product categories',
    'Searching product databases',
    'Comparing prices & reviews',
    'AI selecting best matches',
    'Optimizing for budget',
    'Finalizing recommendations'
  ];
}

// Detect single item queries
function detectSingleItemQuery(query) {
  const singleItemKeywords = [
    'watch', 'watches', 'smartwatch', 'phone', 'smartphone', 'tablet', 'laptop', 'headphones', 'earbuds',
    'speaker', 'camera', 'tv', 'television', 'monitor', 'keyboard', 'mouse', 'charger',
    'shirt', 'pants', 'shoes', 'jacket', 'hat', 'bag', 'backpack', 'wallet', 'sunglasses',
    'bottle', 'water bottle', 'mug', 'cup', 'pillow', 'blanket', 'lamp', 'chair', 'table',
    'book', 'notebook', 'pen', 'pencil', 'umbrella', 'towel'
  ];
  
  const setupKeywords = [
    'setup', 'collection', 'kit', 'set', 'bundle', 'essentials', 'gear', 'equipment',
    'system', 'station', 'workspace', 'room', 'office', 'gaming', 'bedroom', 'kitchen'
  ];
  
  // If query contains setup keywords, it's not a single item
  for (const keyword of setupKeywords) {
    if (query.includes(keyword)) {
      return false;
    }
  }
  
  // Check if query matches single item patterns
  for (const keyword of singleItemKeywords) {
    if (query === keyword || query === keyword + 's' || query.includes(keyword)) {
      return true;
    }
  }
  
  // If query is very short (1-2 meaningful words), likely single item
  const words = query.split(' ').filter(w => w.length > 2);
  if (words.length <= 2) {
    return true;
  }
  
  return false;
}

// Start loading animation
function startLoadingAnimation() {
  loadingSteps = generateLoadingSteps(currentQuery);
  currentStepIndex = 0;
  
  // Update subtext
  loadingSubtext.textContent = `Analyzing the best products for your ${currentQuery}`;
  
  // Start with first step
  updateLoadingStep();
  
  // Set up interval to progress through steps
  loadingInterval = setInterval(() => {
    if (currentStepIndex < loadingSteps.length - 1) {
      // Complete current step
      completeCurrentStep();
      
      // Move to next step after showing completion
      setTimeout(() => {
        currentStepIndex++;
        updateLoadingStep();
      }, 800);
    }
  }, Math.random() * 2000 + 1500); // 1.5-3.5 seconds per step
}

// Update loading step
function updateLoadingStep() {
  if (currentStepIndex < loadingSteps.length) {
    stepText.textContent = loadingSteps[currentStepIndex];
    progressText.textContent = `${currentStepIndex + 1} / ${loadingSteps.length}`;
    progressFill.style.width = `${((currentStepIndex + 1) / loadingSteps.length) * 100}%`;
    
    // Reset step appearance
    const stepContent = document.querySelector('.step-content');
    const loadingStep = document.querySelector('.loading-step');
    stepContent.classList.remove('completed');
    loadingStep.classList.add('active');
    
    // Reset indicator to spinner
    const indicator = document.querySelector('.step-indicator');
    indicator.innerHTML = '<div class="step-spinner"></div>';
  }
}

// Complete current step
function completeCurrentStep() {
  const stepContent = document.querySelector('.step-content');
  const indicator = document.querySelector('.step-indicator');
  
  stepContent.classList.add('completed');
  indicator.innerHTML = `
    <div class="step-checkmark">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  `;
}

// Stop loading animation
function stopLoadingAnimation() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
}

// Handle search
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }

  currentQuery = query;
  showLoadingSection();
  startLoadingAnimation();

  try {
    const settings = {
      style: styleSelect.value,
      budget: parseInt(budgetRange.value),
      currency: currencySelect.value,
      amazonOnly: amazonOnly.checked
    };

    const response = await fetch(`${API_BASE_URL}/api/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        settings: settings
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    stopLoadingAnimation();
    
    if (data.products && data.products.length > 0) {
      currentResults = data.products;
      displayResults(data.products.slice(0, 5)); // Show first 5 results
      showResultsSection();
    } else {
      throw new Error('No products found');
    }

  } catch (error) {
    console.error('Search error:', error);
    stopLoadingAnimation();
    showErrorSection(error.message);
  }
}

// Display results
function displayResults(products) {
  resultsList.innerHTML = '';
  
  products.forEach(product => {
    const productElement = createProductElement(product);
    resultsList.appendChild(productElement);
  });
}

// Create product element with better data handling
function createProductElement(product) {
  const div = document.createElement('div');
  div.className = 'product-item';
  div.addEventListener('click', () => openProductUrl(product.url || product.link));

  // Fix undefined names - use multiple fallbacks
  const productName = product.title || product.name || product.productName || product.displayName || 'Product Name Not Available';
  
  // Format price with proper fallback and currency handling
  let price = 'Price not available';
  if (product.price) {
    price = typeof product.price === 'string' ? product.price : `$${product.price}`;
  } else if (product.currentPrice) {
    price = typeof product.currentPrice === 'string' ? product.currentPrice : `$${product.currentPrice}`;
  } else if (product.salePrice) {
    price = typeof product.salePrice === 'string' ? product.salePrice : `$${product.salePrice}`;
  }
  
  // Format rating with proper fallback
  let rating = 'No rating';
  if (product.rating && product.rating > 0) {
    const stars = '★'.repeat(Math.floor(product.rating));
    const emptyStars = '☆'.repeat(5 - Math.floor(product.rating));
    rating = `<span class="stars">${stars}${emptyStars}</span> ${product.rating}`;
  }

  // Use proper image with multiple fallbacks
  const imageUrl = product.image || product.imageUrl || product.thumbnail || product.img || product.picture;
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMWExYTFhIiByeD0iMTIiLz4KPHN2ZyB4PSIzMCIgeT0iMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0MDQwNDAiIHN0cm9rZS13aWR0aD0iMiI+CjxwYXRoIGQ9Im00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPgo8L3N2Zz4KPC9zdmc+';

  div.innerHTML = `
    <img src="${imageUrl || fallbackImage}" 
         alt="${productName}" 
         class="product-image"
         onerror="this.src='${fallbackImage}'">
    <div class="product-info">
      <div class="product-name">${productName}</div>
      <div class="product-price">${price}</div>
      <div class="product-rating">${rating}</div>
      ${product.merchant ? `<div class="merchant-badge">${product.merchant.split(' - ')[0]}</div>` : ''}
    </div>
  `;

  return div;
}

// Open product URL
function openProductUrl(url) {
  if (url) {
    chrome.tabs.create({ url: url });
  }
}

// Open full results
function openFullResults() {
  const searchParams = new URLSearchParams({
    q: currentQuery,
    style: styleSelect.value,
    budget: budgetRange.value,
    currency: currencySelect.value,
    amazonOnly: amazonOnly.checked
  });
  
  const fullResultsUrl = `${API_BASE_URL}/results?${searchParams.toString()}`;
  chrome.tabs.create({ url: fullResultsUrl });
}

// Show sections
function showSearchSection() {
  hideAllSections();
  searchSection.style.display = 'block';
  stopLoadingAnimation();
}

function showLoadingSection() {
  hideAllSections();
  loadingSection.style.display = 'flex';
}

function showResultsSection() {
  hideAllSections();
  resultsSection.style.display = 'flex';
  stopLoadingAnimation();
}

function showErrorSection(message) {
  hideAllSections();
  errorSection.style.display = 'flex';
  errorMessage.textContent = message || 'Something went wrong. Please try again.';
  stopLoadingAnimation();
}

function hideAllSections() {
  [searchSection, loadingSection, resultsSection, errorSection].forEach(section => {
    section.style.display = 'none';
  });
}
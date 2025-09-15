// Example usage of validation schemas and utilities
// This file demonstrates how to use the core type definitions and validation

import {
  validateSearchSettings,
  validateProduct,
  validateBuildRequest,
  formatProductPrice,
  convertCurrency,
  calculateTotalCost,
  generateGhostTips,
  ValidationError,
  ExternalAPIError,
  withRetry
} from './index'

// Example 1: Validating search settings
export function exampleValidateSearchSettings() {
  try {
    const settings = validateSearchSettings({
      style: 'Premium',
      budget: 1500,
      currency: 'USD',
      resultsMode: 'Multiple',
      region: 'US',
      amazonOnly: false
    })
    
    return settings
  } catch (error) {
    throw error
  }
}

// Example 2: Validating a product
export function exampleValidateProduct() {
  try {
    const product = validateProduct({
      id: 'prod-123',
      title: 'Ergonomic Gaming Chair',
      price: 299.99,
      currency: 'USD',
      merchant: 'Amazon',
      rating: 4.5,
      reviewCount: 1250,
      imageUrl: 'https://example.com/chair.jpg',
      productUrl: 'https://amazon.com/chair',
      rationale: 'Excellent ergonomic design with lumbar support and adjustable armrests',
      category: 'Furniture',
      features: ['Ergonomic design', 'Lumbar support', 'Adjustable height'],
      pros: ['Very comfortable', 'Durable construction', 'Good value'],
      cons: ['Assembly required', 'Heavy'],
      confidence: 0.92,
      searchRank: 1
    })
    
    return product
  } catch (error) {
    throw error
  }
}

// Example 3: Currency formatting and conversion
export function exampleCurrencyOperations() {
  // Format prices in different currencies
  const usdPrice = formatProductPrice(299.99, 'USD') // "$299.99"
  const eurPrice = formatProductPrice(249.99, 'EUR') // "€249.99"
  
  // Convert currencies
  const convertedPrice = convertCurrency(299.99, 'USD', 'EUR') // ~254.99
  
  // Calculate total cost with mixed currencies
  const items = [
    { price: 299.99, currency: 'USD' },
    { price: 199.99, currency: 'EUR' },
    { price: 149.99, currency: 'GBP' }
  ]
  
  const totalInUSD = calculateTotalCost(items, 'USD')
  
  return { usdPrice, eurPrice, convertedPrice, totalInUSD }
}

// Example 4: Error handling with retry
export async function exampleErrorHandlingWithRetry() {
  let attempts = 0
  
  const unreliableOperation = async () => {
    attempts++
    if (attempts < 3) {
      throw new ExternalAPIError('Temporary API failure', 'API_TIMEOUT', true)
    }
    return 'Success after retries'
  }
  
  try {
    const result = await withRetry(unreliableOperation, {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 100,
      maxDelay: 1000
    })
    
    return result
  } catch (error) {
    throw error
  }
}

// Example 5: Build request validation
export function exampleBuildRequest() {
  try {
    const request = validateBuildRequest({
      query: 'gaming setup under $2000',
      settings: {
        style: 'Premium',
        budget: 2000,
        currency: 'USD',
        resultsMode: 'Multiple',
        region: 'US',
        amazonOnly: false
      }
    })
    
    // Generate ghost tips for this request
    const tips = generateGhostTips({
      query: request.query,
      budget: request.settings.budget,
      style: request.settings.style,
      isLoading: true
    })
    
    return { request, tips }
  } catch (error) {
    throw error
  }
}

// Example 6: Complete workflow example
export async function exampleCompleteWorkflow() {
  try {
    // 1. Validate search settings
    const settings = exampleValidateSearchSettings()
    
    // 2. Create and validate build request
    const { request, tips } = exampleBuildRequest()
    
    // 3. Simulate product validation
    const product = exampleValidateProduct()
    
    // 4. Perform currency operations
    const currencyResults = exampleCurrencyOperations()
    
    // 5. Demonstrate error handling
    await exampleErrorHandlingWithRetry()
    
    return {
      settings,
      request,
      tips,
      product,
      currencyResults
    }
  } catch (error) {
    throw error
  }
}

// Export all examples for easy testing
export const examples = {
  validateSearchSettings: exampleValidateSearchSettings,
  validateProduct: exampleValidateProduct,
  currencyOperations: exampleCurrencyOperations,
  errorHandlingWithRetry: exampleErrorHandlingWithRetry,
  buildRequest: exampleBuildRequest,
  completeWorkflow: exampleCompleteWorkflow
}
/**
 * Example usage of Redis caching utilities
 * This file demonstrates how to use the caching functions in the application
 */

import {
  cacheSearchResults,
  getCachedSearchResults,
  storeSharedSetup,
  getSharedSetup,
  checkRedisHealth,
  type CachedSearchResult,
  type CachedSetup,
} from '../cache'
import { generateShareId, generateUniqueShareId } from '../share-id'
import type { SearchSettings } from '@/types'

// Example search settings
const exampleSettings: SearchSettings = {
  style: 'Premium',
  budget: 1000,
  currency: 'USD',
  resultsMode: 'Multiple',
  region: 'US',
  amazonOnly: false,
}

// Example search result
const exampleSearchResult: CachedSearchResult = {
  products: [
    {
      id: 'prod-1',
      title: 'Ergonomic Office Chair',
      price: 299.99,
      currency: 'USD',
      merchant: 'Amazon',
      rating: 4.5,
      reviewCount: 1250,
      imageUrl: 'https://example.com/chair.jpg',
      productUrl: 'https://amazon.com/chair',
      rationale: 'Excellent lumbar support and adjustability',
      category: 'Chair',
      features: ['Lumbar support', 'Adjustable height', 'Mesh back'],
      pros: ['Comfortable', 'Durable', 'Good value'],
      cons: ['Assembly required'],
      confidence: 0.92,
      searchRank: 1,
    },
  ],
  searchMetadata: {
    query: 'office chair',
    totalResults: 1,
    searchedAt: new Date().toISOString(),
    region: 'US',
  },
  ghostTips: ['Ergonomic chairs can improve productivity! 👻'],
  isSetup: false,
}

/**
 * Example: Cache and retrieve search results
 */
export async function exampleCacheSearchResults() {
  const query = 'office chair'
  
  // Cache the search results
  await cacheSearchResults(query, exampleSettings, exampleSearchResult)
  
  // Retrieve cached results
  const cached = await getCachedSearchResults(query, exampleSettings)
}

/**
 * Example: Store and retrieve shared setup
 */
export async function exampleSharedSetup() {
  // Generate a unique share ID
  const shareId = await generateUniqueShareId(async (id) => {
    // Check if ID already exists (in real app, this would check Redis)
    const existing = await getSharedSetup(id)
    return existing !== null
  })
  
  // Create setup to share
  const setup: CachedSetup = {
    id: 'setup-123',
    query: 'office setup',
    products: exampleSearchResult.products,
    budgetDistribution: [
      { category: 'Chair', amount: 300, percentage: 30, color: '#3B82F6' },
      { category: 'Desk', amount: 400, percentage: 40, color: '#10B981' },
      { category: 'Monitor', amount: 300, percentage: 30, color: '#F59E0B' },
    ],
    totalCost: 1000,
    settings: exampleSettings,
    createdAt: new Date().toISOString(),
  }
  
  // Store the shared setup
  await storeSharedSetup(shareId, setup)
  
  // Retrieve the shared setup
  const retrieved = await getSharedSetup(shareId)
  
  return shareId
}

/**
 * Example: Check Redis health
 */
export async function exampleHealthCheck() {
  const isHealthy = await checkRedisHealth()
  
  if (isHealthy) {
    // Redis is healthy and connected
  } else {
    console.log('❌ Redis connection failed')
  }
  
  return isHealthy
}

/**
 * Example: Generate share IDs
 */
export function exampleShareIdGeneration() {
  // Generate simple share ID
  const simpleId = generateShareId()
  console.log('Simple share ID:', simpleId)
  
  // Generate longer share ID
  const longId = generateShareId(12)
  console.log('Long share ID:', longId)
  
  return { simpleId, longId }
}

/**
 * Run all examples (for testing purposes)
 */
export async function runAllExamples() {
  console.log('🚀 Running Redis utilities examples...\n')
  
  try {
    // Check Redis health first
    console.log('1. Health Check:')
    await exampleHealthCheck()
    console.log()
    
    // Generate share IDs
    console.log('2. Share ID Generation:')
    exampleShareIdGeneration()
    console.log()
    
    // Cache search results
    console.log('3. Search Results Caching:')
    await exampleCacheSearchResults()
    console.log()
    
    // Shared setup
    console.log('4. Shared Setup:')
    const shareId = await exampleSharedSetup()
    console.log()
    
    console.log('✅ All examples completed successfully!')
    return { success: true, shareId }
    
  } catch (error) {
    console.error('❌ Example failed:', error)
    return { success: false, error }
  }
}
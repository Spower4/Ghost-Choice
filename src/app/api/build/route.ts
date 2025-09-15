import { NextRequest, NextResponse } from 'next/server'
import { BuildRequestSchema } from '@/lib/validation'

// Force Node.js runtime for external SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { generatePlan, selectBestProduct } from '@/lib/api/gemini'
import { SerpAPIClient } from '@/lib/api/serpapi'
import { handleZodError } from '@/lib/errors'
import { getGhostTipsCached } from '@/lib/ghostTips'
import { getRegionFromCurrency } from '@/lib/currency'
import { saveSearchResults } from '@/lib/search-cache'
import {
  PlanRequest,
  BuildResponse,
  RawProduct
} from '@/types/api'
import { Product } from '@/types'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = BuildRequestSchema.parse(body)

    // Step 1: Generate comprehensive plan using Gemini AI
    const planRequest: PlanRequest = {
      query: validatedRequest.query,
      budget: validatedRequest.settings.budget,
      style: validatedRequest.settings.style,
      currency: validatedRequest.settings.currency
    }

    // Step 1.5: Check if this is a single item query
    const isSingleItemQuery = detectSingleItemQuery(validatedRequest.query)

    let plan
    if (isSingleItemQuery) {
      plan = createSingleItemPlan(validatedRequest)
    } else {
      try {
        // Generate plan using Gemini AI for setup queries with timeout
        plan = await Promise.race([
          generatePlan(planRequest),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Plan timeout')), 10000))
        ]) as any
      } catch (error: unknown) {
        console.warn('Plan generation failed, using fallback:', error)
        plan = createIntelligentFallback(validatedRequest)
      }
    }

    // Step 2: Initialize SerpAPI client
    if (!process.env.SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured', type: 'configuration' },
        { status: 500 }
      )
    }

    const serpApiClient = new SerpAPIClient(process.env.SERPAPI_KEY)

    // Step 3: Extract needs from plan (handle both old and new format)
    const needs = extractNeedsFromPlan(plan)
    console.log(`🔍 Processing ${needs.length} items:`, needs.map((n: any) => `${n.name} ($${n.targetPrice})`))

    // Step 4: Process all searches in parallel for faster response
    const selectedProducts: Product[] = []
    const region = getRegionFromCurrency(validatedRequest.settings.currency)
    const context = {
      budget: validatedRequest.settings.budget,
      style: validatedRequest.settings.style,
      region: region
    }

    // Process searches in parallel with timeout
    const searchPromises = needs.map(async (need: any, index: number) => {
      console.log(`🛍️ [${index + 1}/${needs.length}] Searching for: ${need.name} (budget: $${need.targetPrice})`)

      try {
        // Search for products with timeout
        const searchResponse = await Promise.race([
          serpApiClient.searchProducts({
            query: need.name,
            currency: validatedRequest.settings.currency,
            amazonOnly: validatedRequest.settings.amazonOnly,
            limit: 8 // Reduced for faster response
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 15000))
        ]) as any

        console.log(`📦 Found ${searchResponse.products.length} products for ${need.name}`)

        if (searchResponse.products.length > 0) {
          try {
            // Try Gemini AI selection first with timeout
            const selectedProduct = await Promise.race([
              selectBestProduct(need, searchResponse.products, context, selectedProducts),
              new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 8000))
            ]) as any

            if (selectedProduct) {
              console.log(`✅ AI Selected: "${selectedProduct.title}" - $${selectedProduct.price}`)
              return selectedProduct
            }
          } catch (aiError) {
            console.warn(`⚠️ AI selection failed for "${need.name}", using fallback`)
          }

          // Fallback: Simple heuristic selection
          const fallbackProduct = selectFallbackProduct(need, searchResponse.products)
          if (fallbackProduct) {
            console.log(`✅ Fallback selected: "${fallbackProduct.title}" - $${fallbackProduct.price}`)
            return fallbackProduct
          }
        }

        console.log(`❌ No suitable product found for ${need.name}`)
        return null

      } catch (error) {
        console.warn(`⚠️ Search failed for "${need.name}":`, error)
        return null
      }
    })

    // Wait for all searches to complete with overall timeout
    const searchResults = await Promise.allSettled(searchPromises)
    
    // Extract successful results
    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        selectedProducts.push(result.value)
      }
    })

    // Step 5: Validate total budget
    const totalCost = selectedProducts.reduce((sum, product) => sum + product.price, 0)
    console.log(`💰 Total cost: $${totalCost} / $${validatedRequest.settings.budget}`)

    if (totalCost > validatedRequest.settings.budget) {
      console.log('⚠️ Over budget, removing least essential items')
      // Sort by priority (assuming lower searchRank = higher priority) and remove items
      selectedProducts.sort((a, b) => (a.searchRank || 999) - (b.searchRank || 999))

      let adjustedProducts: Product[] = []
      let runningTotal = 0

      for (const product of selectedProducts) {
        if (runningTotal + product.price <= validatedRequest.settings.budget) {
          adjustedProducts.push(product)
          runningTotal += product.price
        }
      }

      console.log(`Adjusted to ${adjustedProducts.length} products, total: $${runningTotal}`)
      selectedProducts.length = 0
      selectedProducts.push(...adjustedProducts)
    }

    // Step 6: Generate ghost tips
    let ghostTips = getGhostTipsCached()

    if (selectedProducts.length === 0) {
      ghostTips = [
        "👻 No products found within budget - try increasing your budget",
        "Consider turning off Amazon-only to see more options",
        "Try a broader search term for better results"
      ]
    } else if (selectedProducts.length < needs.length) {
      ghostTips = [
        `👻 Found ${selectedProducts.length} of ${needs.length} items within budget`,
        "Consider increasing budget for complete setup",
        "All selected items offer great value for money"
      ]
    }

    // Step 7: Save results to cache
    const searchId = saveSearchResults(
      validatedRequest.query,
      validatedRequest.settings,
      selectedProducts
    )

    // Step 8: Build response
    const buildResponse: BuildResponse = {
      products: selectedProducts,
      budgetChart: undefined,
      ghostTips,
      searchMetadata: {
        totalResults: selectedProducts.length,
        searchTime: Date.now() - startTime,
        query: validatedRequest.query,
        currency: validatedRequest.settings.currency
      },
      isSetup: true,
      searchId
    }

    const totalTime = Date.now() - startTime
    console.log(`🎉 Build complete: ${selectedProducts.length} products selected, cached as ${searchId}`)
    console.log(`⏱️ Total processing time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
    return NextResponse.json(buildResponse)

  } catch (error) {
    console.error('Build API error:', error)

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      const validationError = handleZodError(error)
      return NextResponse.json(
        {
          error: 'Invalid request data',
          type: 'VALIDATION_ERROR',
          details: validationError.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        type: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// Fallback product selection function
function selectFallbackProduct(need: any, products: RawProduct[]): Product | null {
  // Filter products within budget
  const budgetFiltered = products.filter(p => p.price && p.price <= need.targetPrice)
  
  if (budgetFiltered.length === 0) return null

  // Score products by value (rating * reviews / price)
  const scored = budgetFiltered.map(p => {
    const rating = p.rating || 3.5
    const reviews = Math.log((p.reviewCount || 0) + 1)
    const price = p.price || need.targetPrice
    const score = (rating * reviews) / Math.max(price, 1)
    
    return { product: p, score }
  })

  // Sort by score and pick the best
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0].product

  // Validate and fix image URL
  const imageUrl = validateImageUrl(best.image) || generatePlaceholderImage(best.title, need.name)

  return {
    id: best.id,
    title: best.title,
    price: best.price || 0,
    currency: best.currency || 'USD',
    merchant: best.merchant || 'Unknown',
    rating: best.rating || 0,
    reviewCount: best.reviewCount || 0,
    imageUrl: imageUrl,
    productUrl: best.url || '#',
    rationale: 'Selected based on best value for money',
    category: need.name,
    features: [],
    pros: ['Good value', 'Within budget'],
    cons: ['Limited AI analysis'],
    confidence: 0.7,
    searchRank: 1
  }
}

// Helper function to validate image URLs
function validateImageUrl(url: string | undefined): string | null {
  if (!url) return null
  
  try {
    const parsedUrl = new URL(url)
    // Check if it's a valid HTTP/HTTPS URL
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return url
    }
  } catch {
    // Invalid URL
  }
  
  return null
}

// Helper function to generate category-specific placeholder images
function generatePlaceholderImage(title: string, category: string): string {
  const categoryLower = category.toLowerCase()
  
  // Category-specific placeholder colors and icons
  const categoryMappings = {
    'gaming': { color: '6366f1', icon: '🎮' },
    'monitor': { color: '3b82f6', icon: '🖥️' },
    'chair': { color: '8b5cf6', icon: '🪑' },
    'desk': { color: '10b981', icon: '🪑' },
    'keyboard': { color: 'f59e0b', icon: '⌨️' },
    'mouse': { color: 'ef4444', icon: '🖱️' },
    'headset': { color: 'ec4899', icon: '🎧' },
    'laptop': { color: '6b7280', icon: '💻' },
    'office': { color: '059669', icon: '🏢' },
    'storage': { color: '7c3aed', icon: '📦' },
    'lighting': { color: 'f97316', icon: '💡' }
  }
  
  // Find matching category
  let mapping = { color: '6b7280', icon: '📦' } // default
  for (const [key, value] of Object.entries(categoryMappings)) {
    if (categoryLower.includes(key)) {
      mapping = value
      break
    }
  }
  
  // Create a placeholder with category-specific styling
  const encodedTitle = encodeURIComponent(title.substring(0, 30))
  return `https://via.placeholder.com/400x300/${mapping.color}/ffffff?text=${mapping.icon}+${encodedTitle}`
}

// Helper functions (keeping existing implementations)
function detectSingleItemQuery(query: string): boolean {
  const setupKeywords = [
    'setup', 'room', 'office', 'bedroom', 'kitchen', 'living room', 
    'gaming', 'workspace', 'studio', 'home office', 'apartment',
    'desk setup', 'work from home', 'home workspace', 'office setup'
  ]
  const queryLower = query.toLowerCase()
  
  // Check for setup keywords
  const isSetup = setupKeywords.some(keyword => queryLower.includes(keyword))
  
  // Special case: if it contains "home office" or similar, it's definitely a setup
  if (queryLower.includes('home office') || queryLower.includes('office setup') || queryLower.includes('workspace')) {
    return false // Not a single item, it's a setup
  }
  
  return !isSetup
}

function createSingleItemPlan(request: any) {
  return {
    planType: "SINGLE",
    needs: [{
      key: "item",
      name: request.query,
      targetPrice: request.settings.budget,
      specs: "Within budget Good quality"
    }]
  }
}

function extractNeedsFromPlan(plan: any) {
  if (plan.needs && Array.isArray(plan.needs)) {
    return plan.needs
  }
  
  if (plan.categories && Array.isArray(plan.categories)) {
    return plan.categories.map((cat: any) => ({
      key: cat.category.toLowerCase().replace(/\s+/g, '_'),
      name: cat.category,
      targetPrice: cat.budgetAllocation,
      specs: cat.requirements?.join(' ') || ''
    }))
  }
  
  return []
}

function createIntelligentFallback(request: any) {
  const budget = request.settings.budget
  const query = request.query.toLowerCase()
  const style = request.settings.style
  const isPremium = style === 'Premium'

  // Home Office Setup
  if (query.includes('home office') || query.includes('office setup') || query.includes('workspace') || query.includes('work from home')) {
    return {
      planType: "SETUP",
      needs: [
        {
          key: "desk",
          name: isPremium ? "Premium Standing Desk Large" : "Office Desk Large",
          targetPrice: Math.round(budget * 0.25),
          specs: isPremium ? "Standing desk Premium materials Large surface" : "Large surface Sturdy Good storage"
        },
        {
          key: "chair",
          name: isPremium ? "Premium Ergonomic Office Chair" : "Ergonomic Office Chair",
          targetPrice: Math.round(budget * 0.20),
          specs: isPremium ? "Premium ergonomic Lumbar support High-end materials" : "Ergonomic Comfortable Adjustable"
        },
        {
          key: "monitor",
          name: isPremium ? "4K Monitor 27 inch Professional" : "Monitor 24 inch Office",
          targetPrice: Math.round(budget * 0.18),
          specs: isPremium ? "4K 27+ inch IPS Professional" : "1080p+ Good size IPS"
        },
        {
          key: "laptop",
          name: isPremium ? "Premium Business Laptop" : "Business Laptop",
          targetPrice: Math.round(budget * 0.15),
          specs: isPremium ? "High performance Premium build Professional" : "Good performance Reliable Business grade"
        },
        {
          key: "lighting",
          name: isPremium ? "Premium Desk Lamp LED" : "Desk Lamp LED",
          targetPrice: Math.round(budget * 0.08),
          specs: isPremium ? "LED Premium design Adjustable" : "LED Good lighting Adjustable"
        },
        {
          key: "storage",
          name: isPremium ? "Premium Office Storage Cabinet" : "Office Storage Solutions",
          targetPrice: Math.round(budget * 0.07),
          specs: isPremium ? "Premium materials Good capacity Stylish" : "Good storage Functional Affordable"
        },
        {
          key: "keyboard",
          name: isPremium ? "Premium Wireless Keyboard Mouse" : "Wireless Keyboard Mouse Set",
          targetPrice: Math.round(budget * 0.04),
          specs: isPremium ? "Premium wireless Ergonomic Professional" : "Wireless Reliable Good quality"
        },
        {
          key: "accessories",
          name: "Office Desk Accessories",
          targetPrice: Math.round(budget * 0.03),
          specs: "Desk organizer Useful accessories Good quality"
        }
      ]
    }
  }

  // Gaming Setup
  if (query.includes('gaming') || query.includes('game') || query.includes('pc')) {
    return {
      planType: "SETUP",
      needs: [
        {
          key: "gaming_pc",
          name: isPremium ? "High-End Gaming PC Desktop Computer" : "Gaming PC Desktop Computer",
          targetPrice: Math.round(budget * 0.45),
          specs: isPremium ? "RTX 4070+ Intel i7+ 32GB RAM" : "GTX 1660+ Intel i5+ 16GB RAM"
        },
        {
          key: "monitor",
          name: isPremium ? "4K Gaming Monitor 144Hz" : "Gaming Monitor 1080p 144Hz",
          targetPrice: Math.round(budget * 0.20),
          specs: isPremium ? "4K 144Hz HDR IPS" : "1080p 144Hz Fast response"
        },
        {
          key: "chair",
          name: isPremium ? "Premium Gaming Chair Ergonomic" : "Gaming Chair Comfortable",
          targetPrice: Math.round(budget * 0.15),
          specs: isPremium ? "Ergonomic Leather Premium" : "Comfortable Adjustable"
        },
        {
          key: "desk",
          name: isPremium ? "Premium Gaming Desk Large" : "Gaming Desk",
          targetPrice: Math.round(budget * 0.08),
          specs: isPremium ? "Large Premium materials" : "Sturdy Good size"
        },
        {
          key: "keyboard",
          name: isPremium ? "Mechanical Gaming Keyboard RGB" : "Gaming Keyboard",
          targetPrice: Math.round(budget * 0.04),
          specs: isPremium ? "Mechanical RGB Premium" : "Responsive Good build"
        },
        {
          key: "mouse",
          name: isPremium ? "High-End Gaming Mouse" : "Gaming Mouse",
          targetPrice: Math.round(budget * 0.03),
          specs: isPremium ? "High DPI Premium sensor" : "Good DPI Reliable"
        },
        {
          key: "headset",
          name: isPremium ? "Premium Gaming Headset" : "Gaming Headset",
          targetPrice: Math.round(budget * 0.03),
          specs: isPremium ? "7.1 Surround Premium" : "Good sound Comfortable"
        },
        {
          key: "mousepad",
          name: "Gaming Mousepad Large",
          targetPrice: Math.round(budget * 0.02),
          specs: "Large Extended Good surface"
        }
      ]
    }
  }

  // Default fallback
  return {
    planType: "SINGLE",
    needs: [{
      key: "item",
      name: request.query,
      targetPrice: request.settings.budget,
      specs: "Within budget Good quality"
    }]
  }
}
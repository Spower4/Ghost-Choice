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
  BuildResponse
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
        // Generate plan using Gemini AI for setup queries
        plan = await generatePlan(planRequest)
      } catch (error: unknown) {
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

    // Step 4: For each item, search products and let Gemini pick the best one
    const selectedProducts: Product[] = []
    const region = getRegionFromCurrency(validatedRequest.settings.currency)
    const context = {
      budget: validatedRequest.settings.budget,
      style: validatedRequest.settings.style,
      region: region
    }

    for (let i = 0; i < needs.length; i++) {
      const need = needs[i]
      console.log(`\n🛍️ [${i + 1}/${needs.length}] Searching for: ${need.name} (budget: $${need.targetPrice})`)

      try {
        // Search for products
        const searchResponse = await serpApiClient.searchProducts({
          query: need.name,
          currency: validatedRequest.settings.currency,
          amazonOnly: validatedRequest.settings.amazonOnly,
          limit: 15 // Get more options for AI to choose from
        })

        console.log(`   📦 Found ${searchResponse.products.length} products`)

        if (searchResponse.products.length > 0) {
          // Let Gemini AI select the best product with context awareness
          const selectedProduct = await selectBestProduct(need, searchResponse.products, context, selectedProducts)

          if (selectedProduct) {
            selectedProducts.push(selectedProduct)
            console.log(`   ✅ Selected: "${selectedProduct.title}" - $${selectedProduct.price}`)
          } else {
            console.log(`   ❌ No suitable product found within budget`)
          }
        } else {
          console.log(`   ❌ No products found`)
        }

        // Small delay to avoid rate limits
        if (i < needs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }

      } catch (error) {
        console.warn(`   ⚠️ Search failed for "${need.name}":`, error)
      }
    }

    // Step 5: Validate total budget
    const totalCost = selectedProducts.reduce((sum, product) => sum + product.price, 0)
    console.log(`\n💰 Total cost: $${totalCost} / $${validatedRequest.settings.budget}`)

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

      console.log(`   Adjusted to ${adjustedProducts.length} products, total: $${runningTotal}`)
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
      searchId // Add search ID to response
    }

    const totalTime = Date.now() - startTime
    console.log(`\n🎉 Build complete: ${selectedProducts.length} products selected, cached as ${searchId}`)
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

// Helper function to create intelligent fallback plan
function createIntelligentFallback(request: any) {
  const budget = request.settings.budget
  const query = request.query.toLowerCase()
  const style = request.settings.style
  const isPremium = style === 'Premium'

  // Kitchen Setup - Add this FIRST to catch kitchen queries
  if (query.includes('kitchen') || query.includes('cook') || query.includes('food')) {
    return {
      planType: "SETUP",
      needs: [
        {
          key: "refrigerator",
          name: isPremium ? "Premium Refrigerator" : "Refrigerator",
          targetPrice: Math.round(budget * 0.30),
          specs: isPremium ? "Stainless steel Energy efficient Large capacity" : "Good capacity Energy efficient Reliable"
        },
        {
          key: "stove",
          name: isPremium ? "Premium Gas Range" : "Stove Cooktop",
          targetPrice: Math.round(budget * 0.20),
          specs: isPremium ? "Gas burners Oven included Professional grade" : "Multiple burners Reliable Easy to clean"
        },
        {
          key: "microwave",
          name: isPremium ? "Convection Microwave" : "Microwave",
          targetPrice: Math.round(budget * 0.10),
          specs: isPremium ? "Convection feature Large capacity Stainless steel" : "Good size Reliable Easy to use"
        },
        {
          key: "cookware",
          name: isPremium ? "Professional Cookware Set" : "Cookware Set",
          targetPrice: Math.round(budget * 0.10),
          specs: isPremium ? "Stainless steel Professional grade Complete set" : "Non-stick Durable Complete set"
        },
        {
          key: "appliances",
          name: isPremium ? "Small Kitchen Appliances Premium" : "Small Kitchen Appliances",
          targetPrice: Math.round(budget * 0.12),
          specs: isPremium ? "High-end brands Multiple appliances Durable" : "Essential appliances Good quality Value"
        },
        {
          key: "knives",
          name: isPremium ? "Professional Knife Set" : "Kitchen Knife Set",
          targetPrice: Math.round(budget * 0.06),
          specs: isPremium ? "Professional grade Sharp Complete set" : "Sharp Durable Essential knives"
        },
        {
          key: "dinnerware",
          name: isPremium ? "Premium Dinnerware Set" : "Dinnerware Set",
          targetPrice: Math.round(budget * 0.05),
          specs: isPremium ? "Premium materials Complete set Elegant" : "Durable Complete set Good value"
        },
        {
          key: "storage",
          name: isPremium ? "Premium Kitchen Storage" : "Kitchen Storage",
          targetPrice: Math.round(budget * 0.04),
          specs: isPremium ? "Premium containers Organization system" : "Good containers Organization"
        }
      ]
    }
  }

  if (query.includes('gaming') || query.includes('game') || query.includes('pc')) {
    // GAMING SETUP - Most important: THE GAMING PC!
    const pcBudget = Math.round(budget * (isPremium ? 0.45 : 0.50)) // 45-50% for PC
    const monitorBudget = Math.round(budget * 0.20) // 20% for monitor
    const chairBudget = Math.round(budget * 0.15) // 15% for chair
    const deskBudget = Math.round(budget * 0.08) // 8% for desk
    const keyboardBudget = Math.round(budget * 0.04) // 4% for keyboard
    const mouseBudget = Math.round(budget * 0.03) // 3% for mouse
    const headsetBudget = Math.round(budget * 0.03) // 3% for headset
    const mousepadBudget = Math.round(budget * 0.02) // 2% for mousepad

    return {
      planType: "SETUP",
      needs: [
        {
          key: "gaming_pc",
          name: isPremium ? "High-End Gaming PC Desktop Computer" : "Gaming PC Desktop Computer",
          targetPrice: pcBudget,
          specs: isPremium ? "RTX 4070+ Intel i7+ 16GB RAM" : "GTX 1660+ Intel i5+ 8GB RAM"
        },
        {
          key: "gaming_monitor",
          name: isPremium ? "4K Gaming Monitor 144Hz" : "Gaming Monitor 1440p 144Hz",
          targetPrice: monitorBudget,
          specs: isPremium ? "4K 144Hz 27-32 inch" : "1440p 144Hz 24-27 inch"
        },
        {
          key: "gaming_chair",
          name: isPremium ? "Premium Gaming Chair Ergonomic" : "Gaming Chair",
          targetPrice: chairBudget,
          specs: isPremium ? "Premium materials lumbar support" : "Comfortable adjustable"
        },
        {
          key: "gaming_desk",
          name: isPremium ? "Premium Gaming Desk Large" : "Gaming Desk",
          targetPrice: deskBudget,
          specs: isPremium ? "Large surface cable management" : "Sturdy good size"
        },
        {
          key: "gaming_keyboard",
          name: isPremium ? "Mechanical Gaming Keyboard RGB" : "Mechanical Gaming Keyboard",
          targetPrice: keyboardBudget,
          specs: isPremium ? "Mechanical switches RGB" : "Mechanical switches"
        },
        {
          key: "gaming_mouse",
          name: isPremium ? "High-End Gaming Mouse" : "Gaming Mouse",
          targetPrice: mouseBudget,
          specs: isPremium ? "High DPI premium sensor" : "Good DPI comfortable"
        },
        {
          key: "gaming_headset",
          name: isPremium ? "Premium Gaming Headset" : "Gaming Headset",
          targetPrice: headsetBudget,
          specs: isPremium ? "Premium audio noise cancelling" : "Good audio microphone"
        },
        {
          key: "gaming_mousepad",
          name: "Gaming Mousepad Large",
          targetPrice: mousepadBudget,
          specs: "Large size smooth surface"
        }
      ]
    }
  } else if (query.includes('office') || query.includes('work') || query.includes('desk')) {
    // HOME OFFICE SETUP
    const laptopBudget = Math.round(budget * 0.40) // 40% for laptop
    const monitorBudget = Math.round(budget * 0.20) // 20% for monitor
    const chairBudget = Math.round(budget * 0.20) // 20% for chair
    const deskBudget = Math.round(budget * 0.15) // 15% for desk
    const accessoriesBudget = Math.round(budget * 0.05) // 5% for accessories

    return {
      planType: "SETUP",
      needs: [
        {
          key: "business_laptop",
          name: isPremium ? "Premium Business Laptop" : "Business Laptop",
          targetPrice: laptopBudget,
          specs: isPremium ? "Intel i7+ 16GB RAM SSD" : "Intel i5+ 8GB RAM SSD"
        },
        {
          key: "office_monitor",
          name: isPremium ? "4K Monitor Professional" : "Monitor 1440p",
          targetPrice: monitorBudget,
          specs: isPremium ? "4K 27+ inch" : "1440p 24+ inch"
        },
        {
          key: "office_chair",
          name: isPremium ? "Premium Ergonomic Office Chair" : "Ergonomic Office Chair",
          targetPrice: chairBudget,
          specs: isPremium ? "Premium materials full adjustability" : "Lumbar support adjustable"
        },
        {
          key: "office_desk",
          name: isPremium ? "Premium Standing Desk" : "Office Desk",
          targetPrice: deskBudget,
          specs: isPremium ? "Height adjustable large surface" : "Sturdy good size"
        },
        {
          key: "office_accessories",
          name: "Office Accessories Keyboard Mouse",
          targetPrice: accessoriesBudget,
          specs: "Wireless comfortable"
        }
      ]
    }
  } else if (query.includes('bedroom') || query.includes('bed') || query.includes('sleep')) {
    // BEDROOM SETUP
    return {
      planType: "SETUP",
      needs: [
        { key: "bed_frame", name: isPremium ? "Premium Bed Frame" : "Bed Frame", targetPrice: Math.round(budget * 0.25) },
        { key: "mattress", name: isPremium ? "Premium Mattress Memory Foam" : "Mattress", targetPrice: Math.round(budget * 0.35) },
        { key: "pillows", name: isPremium ? "Premium Pillows Set" : "Pillows", targetPrice: Math.round(budget * 0.08) },
        { key: "bed_sheets", name: isPremium ? "Premium Bed Sheets Set" : "Bed Sheets", targetPrice: Math.round(budget * 0.07) },
        { key: "nightstand", name: isPremium ? "Premium Nightstand" : "Nightstand", targetPrice: Math.round(budget * 0.12) },
        { key: "bedside_lamp", name: isPremium ? "Premium Bedside Lamp" : "Bedside Lamp", targetPrice: Math.round(budget * 0.08) },
        { key: "dresser", name: isPremium ? "Premium Dresser" : "Dresser", targetPrice: Math.round(budget * 0.05) }
      ]
    }
  }

  // Default to office setup (more general than gaming)
  return createIntelligentFallback({ ...request, query: "office setup" })
}

// Helper function to detect single item queries
function detectSingleItemQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim()

  // Common single item patterns
  const singleItemKeywords = [
    // Electronics
    'watch', 'watches', 'smartwatch', 'phone', 'smartphone', 'tablet', 'laptop', 'headphones', 'earbuds',
    'speaker', 'camera', 'tv', 'television', 'monitor', 'keyboard', 'mouse', 'charger',

    // Clothing & Accessories
    'shirt', 'pants', 'shoes', 'jacket', 'hat', 'bag', 'backpack', 'wallet', 'sunglasses',
    'belt', 'dress', 'jeans', 'sneakers', 'boots',

    // Home & Personal
    'bottle', 'water bottle', 'mug', 'cup', 'pillow', 'blanket', 'lamp', 'chair', 'table',
    'book', 'notebook', 'pen', 'pencil', 'umbrella', 'towel',

    // Health & Beauty
    'toothbrush', 'shampoo', 'soap', 'lotion', 'perfume', 'cologne', 'razor',

    // Kitchen
    'knife', 'pan', 'pot', 'plate', 'bowl', 'spoon', 'fork', 'blender', 'toaster'
  ]

  // Setup/collection keywords that indicate multiple items
  const setupKeywords = [
    'setup', 'collection', 'kit', 'set', 'bundle', 'essentials', 'gear', 'equipment',
    'system', 'station', 'workspace', 'room', 'office', 'gaming', 'bedroom', 'kitchen',
    'living room', 'bathroom', 'studio', 'home', 'complete', 'full'
  ]

  // If query contains setup keywords, it's not a single item
  for (const keyword of setupKeywords) {
    if (lowerQuery.includes(keyword)) {
      return false
    }
  }

  // Check if query matches single item patterns
  for (const keyword of singleItemKeywords) {
    if (lowerQuery === keyword || lowerQuery === keyword + 's' || lowerQuery.includes(keyword)) {
      return true
    }
  }

  // Additional heuristics
  const words = lowerQuery.split(' ').filter(w => w.length > 2)

  // If query is very short (1-2 meaningful words), likely single item
  if (words.length <= 2) {
    return true
  }

  return false
}

// Helper function to create single item focused plan
function createSingleItemPlan(request: any) {
  const budget = request.settings.budget
  const query = request.query.toLowerCase().trim()
  const style = request.settings.style
  const isPremium = style === 'Premium'

  // Create 2-3 variations of the same item type with different budget allocations
  const variations = []

  // Main item (60% budget)
  variations.push({
    key: "main_item",
    name: isPremium ? `Premium ${query}` : query,
    targetPrice: Math.round(budget * 0.60),
    specs: isPremium ? "High-end premium quality" : "Good quality reliable"
  })

  // Alternative option (30% budget) - different style/brand
  variations.push({
    key: "alternative_item",
    name: isPremium ? `Alternative Premium ${query}` : `Alternative ${query}`,
    targetPrice: Math.round(budget * 0.30),
    specs: isPremium ? "Different premium brand/style" : "Different style/brand"
  })

  // Budget option (10% budget) - if there's room
  if (budget > 50) {
    variations.push({
      key: "budget_item",
      name: `Budget ${query}`,
      targetPrice: Math.round(budget * 0.10),
      specs: "Budget-friendly option"
    })
  }

  return {
    planType: "SINGLE_ITEM",
    needs: variations
  }
}

// Helper function to extract needs from plan (handle both formats)
function extractNeedsFromPlan(plan: any) {
  // New format with needs array
  if (plan.needs && Array.isArray(plan.needs)) {
    return plan.needs.map((need: any) => ({
      key: need.key || need.name.toLowerCase().replace(/\s+/g, '_'),
      name: need.name,
      targetPrice: need.targetPrice,
      specs: need.specs
    }))
  }

  // Old format with categories array
  if (plan.categories && Array.isArray(plan.categories)) {
    return plan.categories.map((cat: any) => ({
      key: cat.category.toLowerCase().replace(/\s+/g, '_'),
      name: cat.category,
      targetPrice: cat.budgetAllocation,
      specs: {}
    }))
  }

  return []
}
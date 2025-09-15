import { GoogleGenerativeAI } from '@google/generative-ai'
import {
    PlanRequest,
    PlanResponse,
    RankRequest,
    RankResponse,
    CategoryPlan,
    SearchStrategy,
    RawProduct
} from '@/types/api'
import { Product, BudgetDistribution } from '@/types'
import { ExternalAPIError, RateLimitError, withRetry, handleFetchError } from '@/lib/errors'

// Enhanced Gemini AI client with comprehensive planning
export class EnhancedGeminiAIClient {
    private readonly client: GoogleGenerativeAI
    private readonly model: any

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new ExternalAPIError('Gemini API key is required', 'MISSING_API_KEY', false)
        }

        this.client = new GoogleGenerativeAI(apiKey)
        const MODEL = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.0-flash'
        this.model = this.client.getGenerativeModel({ model: MODEL })
    }

    /**
     * Generate a comprehensive setup plan using enhanced Gemini AI
     */
    async generatePlan(request: PlanRequest): Promise<PlanResponse> {
        try {
            const prompt = this.buildEnhancedPlanningPrompt(request)
            const result = await withRetry(() => this.generateContent(prompt))

            return this.parsePlanResponse(result, request)
        } catch (error) {
            if (error instanceof RateLimitError) {
                throw error
            }
            if (error instanceof ExternalAPIError) {
                throw error
            }
            throw handleFetchError(error, 'Enhanced Gemini AI planning')
        }
    }

    /**
     * Build comprehensive planning prompt for Gemini AI
     */
    private buildEnhancedPlanningPrompt(request: PlanRequest): string {
        const setupType = this.detectSetupType(request.query)
        const isSetup = setupType !== 'single'

        return `You are an expert product consultant creating a comprehensive ${request.style.toLowerCase()} ${request.query} plan with $${request.budget} budget.

${isSetup ? this.getSetupSpecificGuidance(setupType, request.style) : ''}

CRITICAL REQUIREMENTS:
1. List ALL essential items needed for a complete ${request.query}
2. Prioritize items by importance (10 = absolutely essential, 1 = nice to have)
3. Ensure budget allocation reflects real-world pricing
4. Include 6-12 items for setups, 1-3 for single items
5. Each item must have specific, searchable terms

Return JSON only:
{
  "approach": "${isSetup ? 'setup' : 'single'}",
  "categories": [
    {
      "category": "Exact product name (e.g., 'Gaming Desktop Computer', 'Office Chair')",
      "priority": 1-10,
      "budgetAllocation": number,
      "searchTerms": ["specific search term 1", "alternative term 2", "brand/model term 3"],
      "requirements": ["specific requirement 1", "technical spec 2", "quality requirement 3"]
    }
  ],
  "budgetDistribution": [
    {
      "category": "Same as above",
      "amount": number,
      "percentage": number,
      "color": "#FF6B6B"
    }
  ],
  "totalItems": number
}

BUDGET ALLOCATION RULES:
- Most important item: 35-50% of budget
- Secondary items: 15-25% each
- Accessories: 3-10% each
- Total must equal exactly $${request.budget}
- ${request.style === 'Premium' ? 'Premium quality focus - higher budget for main items' : 'Value-focused - balanced budget distribution'}

SEARCH TERMS RULES:
- Use specific, searchable product names
- Include brand names when relevant
- Add technical specifications
- Avoid generic terms like "accessories"

Colors to use in order: #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FECA57, #FF9FF3, #54A0FF, #5F27CD, #FFA07A, #98D8C8, #F7DC6F, #DDA0DD`
    }

    /**
     * Detect setup type from query
     */
    private detectSetupType(query: string): string {
        const lowerQuery = query.toLowerCase()

        if (lowerQuery.includes('gaming') || lowerQuery.includes('game') || lowerQuery.includes('pc')) {
            return 'gaming'
        }
        if (lowerQuery.includes('office') || lowerQuery.includes('work') || lowerQuery.includes('desk')) {
            return 'office'
        }
        if (lowerQuery.includes('bedroom') || lowerQuery.includes('bed') || lowerQuery.includes('sleep')) {
            return 'bedroom'
        }
        if (lowerQuery.includes('kitchen') || lowerQuery.includes('cook') || lowerQuery.includes('food')) {
            return 'kitchen'
        }
        if (lowerQuery.includes('living') || lowerQuery.includes('lounge') || lowerQuery.includes('tv')) {
            return 'living_room'
        }
        if (lowerQuery.includes('studio') || lowerQuery.includes('music') || lowerQuery.includes('recording')) {
            return 'studio'
        }
        if (lowerQuery.includes('gym') || lowerQuery.includes('fitness') || lowerQuery.includes('workout')) {
            return 'gym'
        }

        // Check if it's a specific product vs setup
        const setupKeywords = ['setup', 'room', 'space', 'area', 'complete', 'full', 'entire']
        const hasSetupKeyword = setupKeywords.some(keyword => lowerQuery.includes(keyword))

        return hasSetupKeyword ? 'general_setup' : 'single'
    }

    /**
     * Get setup-specific guidance for different room types
     */
    private getSetupSpecificGuidance(setupType: string, style: string): string {
        const isPremium = style === 'Premium'

        switch (setupType) {
            case 'gaming':
                return `GAMING SETUP ESSENTIALS (in priority order):
1. Gaming PC/Console (40-50% budget) - The heart of any gaming setup
2. Gaming Monitor (15-25% budget) - Essential for visual experience
3. Gaming Chair (10-15% budget) - Comfort for long sessions
4. Gaming Desk (8-12% budget) - Proper workspace
5. Mechanical Keyboard (3-5% budget) - Input precision
6. Gaming Mouse (2-4% budget) - Accuracy and comfort
7. Gaming Headset (3-5% budget) - Audio and communication
8. Mousepad (1-2% budget) - Surface precision
${isPremium ? '9. RGB Lighting (2-3% budget) - Ambiance\n10. Cable Management (1-2% budget) - Organization' : ''}`

            case 'office':
                return `HOME OFFICE ESSENTIALS (in priority order):
1. Computer/Laptop (35-45% budget) - Primary work tool
2. Office Chair (20-25% budget) - Ergonomic support for productivity
3. Desk (15-20% budget) - Workspace foundation
4. Monitor (10-15% budget) - Display for productivity
5. Keyboard & Mouse (3-5% budget) - Input devices
6. Desk Lamp (2-4% budget) - Proper lighting
7. Storage Solutions (2-4% budget) - Organization
8. Webcam (2-3% budget) - Video calls
${isPremium ? '9. Standing Desk Converter (3-5% budget) - Health\n10. Noise Cancelling Headphones (3-5% budget) - Focus' : ''}`

            case 'bedroom':
                return `BEDROOM ESSENTIALS (in priority order):
1. Bed Frame (20-25% budget) - Foundation of bedroom
2. Mattress (30-40% budget) - Most important for sleep quality
3. Pillows (5-8% budget) - Sleep comfort
4. Bed Sheets Set (4-6% budget) - Comfort and hygiene
5. Nightstand (8-12% budget) - Bedside storage
6. Dresser (10-15% budget) - Clothing storage
7. Bedside Lamp (3-5% budget) - Lighting
8. Curtains/Blinds (3-5% budget) - Privacy and light control
${isPremium ? '9. Premium Bedding Set (5-8% budget) - Luxury comfort\n10. Air Purifier (3-5% budget) - Air quality' : ''}`

            case 'kitchen':
                return `KITCHEN ESSENTIALS (in priority order):
1. Refrigerator (25-35% budget) - Food storage
2. Stove/Cooktop (15-25% budget) - Cooking foundation
3. Microwave (8-12% budget) - Quick heating
4. Kitchen Knives Set (5-8% budget) - Food preparation
5. Cookware Set (8-12% budget) - Pots and pans
6. Dinnerware Set (4-6% budget) - Plates and bowls
7. Small Appliances (10-15% budget) - Blender, toaster, etc.
8. Storage Containers (3-5% budget) - Food organization
${isPremium ? '9. Stand Mixer (5-8% budget) - Baking\n10. Coffee Machine (4-6% budget) - Premium brewing' : ''}`

            case 'living_room':
                return `LIVING ROOM ESSENTIALS (in priority order):
1. Sofa/Couch (30-40% budget) - Main seating
2. TV (20-30% budget) - Entertainment center
3. Coffee Table (8-12% budget) - Central surface
4. TV Stand/Entertainment Center (8-12% budget) - TV support
5. Side Tables (4-6% budget) - Additional surfaces
6. Lamps (4-6% budget) - Ambient lighting
7. Rug (5-8% budget) - Floor comfort and style
8. Throw Pillows (2-4% budget) - Comfort and decoration
${isPremium ? '9. Sound System (5-8% budget) - Audio quality\n10. Artwork/Decor (3-5% budget) - Aesthetics' : ''}`

            default:
                return `GENERAL SETUP GUIDANCE:
- Identify the 1-2 most essential items (should get 50-60% of budget)
- Include 3-5 supporting items (20-30% each)
- Add 2-4 accessories/smaller items (5-10% each)
- Ensure all items work together as a cohesive system`
        }
    }

    /**
     * Generate content using Gemini AI with robust error handling
     */
    private async generateContent(prompt: string): Promise<string> {
        try {
            const res = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            })

            const text = res.response?.text?.()
            if (!text) {
                throw new ExternalAPIError('Empty response from Gemini', 'EMPTY_RESPONSE', true)
            }

            return text
        } catch (err: any) {
            const status = err?.status ?? err?.response?.status ?? err?.cause?.status
            const code = (err?.code || '').toString().toUpperCase()
            const msg = (err?.message || '').toLowerCase()

            const is429 = status === 429 ||
                code === 'RESOURCE_EXHAUSTED' ||
                /429|rate limit|quota/i.test(msg)

            if (is429) {
                throw new RateLimitError('Gemini rate limit', 'GEMINI_RATE_LIMIT', { err })
            }

            const is5xx = (status && status >= 500) || /server error|internal/i.test(msg)
            if (is5xx) {
                throw new ExternalAPIError('Gemini server error', `GEMINI_${status || '5XX'}`, true, { err })
            }

            throw new ExternalAPIError(`Gemini error: ${err?.message ?? 'unknown'}`, 'GEMINI_ERROR', false, { err })
        }
    }

    /**
     * Parse planning response from Gemini AI
     */
    private parsePlanResponse(response: string, request: PlanRequest): PlanResponse {
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                response.match(/(\{[\s\S]*\})/)

            if (!jsonMatch) {
                throw new Error('No JSON found in response')
            }

            const parsed = JSON.parse(jsonMatch[1])

            // Validate and normalize categories
            const categories: CategoryPlan[] = (parsed.categories || []).map((cat: any) => ({
                category: cat.category,
                priority: Math.max(1, Math.min(10, cat.priority || 5)),
                budgetAllocation: Math.max(0, cat.budgetAllocation || 0),
                searchTerms: Array.isArray(cat.searchTerms) ? cat.searchTerms : [cat.category],
                requirements: Array.isArray(cat.requirements) ? cat.requirements : []
            }))

            // Sort by priority (highest first)
            categories.sort((a, b) => b.priority - a.priority)

            const budgetDistribution: BudgetDistribution[] = (parsed.budgetDistribution || []).map((dist: any, index: number) => ({
                category: dist.category,
                amount: Math.max(0, dist.amount || 0),
                percentage: Math.max(0, Math.min(100, dist.percentage || 0)),
                color: this.validateColor(dist.color, index)
            }))

            const searchStrategy: SearchStrategy = {
                approach: parsed.approach === 'setup' ? 'setup' : 'single',
                categories: categories.map(c => c.category),
                totalItems: Math.max(1, parsed.totalItems || categories.length)
            }

            return {
                categories,
                budgetDistribution,
                searchStrategy
            }
        } catch (error) {
            console.warn('Failed to parse enhanced Gemini planning response, using comprehensive fallback:', error)
            return this.getComprehensiveFallbackPlan(request)
        }
    }

    /**
     * Validate and normalize color hex codes
     */
    private validateColor(color: string, index: number): string {
        const validColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
            '#FFA07A', '#98D8C8', '#F7DC6F', '#DDA0DD'
        ]

        if (color && /^#[0-9A-F]{6}$/i.test(color)) {
            return color.toUpperCase()
        }

        return validColors[index % validColors.length]
    }

    /**
     * Comprehensive fallback planning when AI fails
     */
    private getComprehensiveFallbackPlan(request: PlanRequest): PlanResponse {
        const setupType = this.detectSetupType(request.query)

        if (setupType === 'gaming') {
            return this.createGamingFallback(request)
        } else if (setupType === 'office') {
            return this.createOfficeFallback(request)
        } else if (setupType === 'bedroom') {
            return this.createBedroomFallback(request)
        } else if (setupType === 'kitchen') {
            return this.createKitchenFallback(request)
        } else if (setupType === 'living_room') {
            return this.createLivingRoomFallback(request)
        } else if (setupType !== 'single') {
            return this.createGeneralSetupFallback(request)
        } else {
            return this.createSingleItemFallback(request)
        }
    }

    /**
     * Create comprehensive gaming setup fallback
     */
    private createGamingFallback(request: PlanRequest): PlanResponse {
        const isPremium = request.style === 'Premium'
        const budget = request.budget

        const categories: CategoryPlan[] = [
            {
                category: isPremium ? 'High-End Gaming Desktop Computer' : 'Gaming Desktop Computer',
                priority: 10,
                budgetAllocation: Math.round(budget * 0.45),
                searchTerms: isPremium ? ['high end gaming pc', 'gaming desktop computer', 'gaming tower'] : ['gaming pc', 'gaming desktop', 'gaming computer'],
                requirements: isPremium ? ['RTX 4070+', 'Intel i7/AMD Ryzen 7+', '16GB+ RAM', 'SSD'] : ['GTX 1660+', 'Intel i5/AMD Ryzen 5+', '8GB+ RAM']
            },
            {
                category: isPremium ? '4K Gaming Monitor 144Hz' : 'Gaming Monitor 1440p',
                priority: 9,
                budgetAllocation: Math.round(budget * 0.20),
                searchTerms: isPremium ? ['4k gaming monitor', '144hz 4k monitor', '27 inch 4k'] : ['gaming monitor', '1440p monitor', '144hz monitor'],
                requirements: isPremium ? ['4K resolution', '144Hz+', '27-32 inch', 'Low latency'] : ['1440p resolution', '144Hz', '24-27 inch']
            },
            {
                category: isPremium ? 'Premium Ergonomic Gaming Chair' : 'Gaming Chair',
                priority: 8,
                budgetAllocation: Math.round(budget * 0.15),
                searchTerms: isPremium ? ['premium gaming chair', 'ergonomic gaming chair', 'high end gaming chair'] : ['gaming chair', 'office gaming chair'],
                requirements: isPremium ? ['Premium materials', 'Full adjustability', 'Lumbar support'] : ['Comfortable', 'Adjustable height', 'Good support']
            },
            {
                category: isPremium ? 'Large Gaming Desk with Cable Management' : 'Gaming Desk',
                priority: 7,
                budgetAllocation: Math.round(budget * 0.08),
                searchTerms: isPremium ? ['large gaming desk', 'gaming desk cable management'] : ['gaming desk', 'computer desk'],
                requirements: isPremium ? ['Large surface', 'Cable management', 'Sturdy build'] : ['Good size', 'Sturdy', 'Cable management']
            },
            {
                category: isPremium ? 'Mechanical Gaming Keyboard RGB' : 'Mechanical Gaming Keyboard',
                priority: 6,
                budgetAllocation: Math.round(budget * 0.04),
                searchTerms: isPremium ? ['mechanical gaming keyboard rgb', 'premium gaming keyboard'] : ['mechanical gaming keyboard', 'gaming keyboard'],
                requirements: isPremium ? ['Mechanical switches', 'RGB lighting', 'Premium build'] : ['Mechanical switches', 'Gaming features']
            },
            {
                category: isPremium ? 'High-DPI Gaming Mouse' : 'Gaming Mouse',
                priority: 5,
                budgetAllocation: Math.round(budget * 0.03),
                searchTerms: isPremium ? ['high dpi gaming mouse', 'professional gaming mouse'] : ['gaming mouse', 'optical gaming mouse'],
                requirements: isPremium ? ['High DPI', 'Premium sensor', 'Ergonomic'] : ['Good DPI', 'Comfortable grip']
            },
            {
                category: isPremium ? 'Premium Gaming Headset' : 'Gaming Headset',
                priority: 4,
                budgetAllocation: Math.round(budget * 0.03),
                searchTerms: isPremium ? ['premium gaming headset', 'high end gaming headset'] : ['gaming headset', 'gaming headphones'],
                requirements: isPremium ? ['Premium audio', 'Noise cancelling', 'Comfortable'] : ['Good audio', 'Microphone', 'Comfortable']
            },
            {
                category: 'Large Gaming Mousepad',
                priority: 3,
                budgetAllocation: Math.round(budget * 0.02),
                searchTerms: ['large gaming mousepad', 'extended mousepad', 'gaming mouse mat'],
                requirements: ['Large size', 'Smooth surface', 'Non-slip base']
            }
        ]

        return this.buildPlanResponse(categories, request)
    }

    /**
     * Create comprehensive office setup fallback
     */
    private createOfficeFallback(request: PlanRequest): PlanResponse {
        const isPremium = request.style === 'Premium'
        const budget = request.budget

        const categories: CategoryPlan[] = [
            {
                category: isPremium ? 'Premium Business Laptop' : 'Business Laptop',
                priority: 10,
                budgetAllocation: Math.round(budget * 0.40),
                searchTerms: isPremium ? ['premium business laptop', 'professional laptop'] : ['business laptop', 'work laptop'],
                requirements: isPremium ? ['Intel i7+', '16GB+ RAM', 'SSD', 'Long battery'] : ['Intel i5+', '8GB+ RAM', 'SSD']
            },
            {
                category: isPremium ? 'Premium Ergonomic Office Chair' : 'Ergonomic Office Chair',
                priority: 9,
                budgetAllocation: Math.round(budget * 0.25),
                searchTerms: isPremium ? ['premium office chair', 'executive chair'] : ['ergonomic office chair', 'office chair'],
                requirements: isPremium ? ['Premium materials', 'Full adjustability', 'Lumbar support'] : ['Lumbar support', 'Adjustable', 'Comfortable']
            },
            {
                category: isPremium ? 'Standing Desk Adjustable' : 'Office Desk',
                priority: 8,
                budgetAllocation: Math.round(budget * 0.15),
                searchTerms: isPremium ? ['standing desk', 'adjustable height desk'] : ['office desk', 'computer desk'],
                requirements: isPremium ? ['Height adjustable', 'Large surface', 'Sturdy'] : ['Good size', 'Sturdy', 'Storage']
            },
            {
                category: isPremium ? '4K Professional Monitor' : 'Office Monitor',
                priority: 7,
                budgetAllocation: Math.round(budget * 0.12),
                searchTerms: isPremium ? ['4k monitor', 'professional monitor'] : ['office monitor', '1440p monitor'],
                requirements: isPremium ? ['4K resolution', '27+ inch', 'Color accurate'] : ['1080p+', '24+ inch', 'Good colors']
            },
            {
                category: 'Wireless Keyboard and Mouse Combo',
                priority: 6,
                budgetAllocation: Math.round(budget * 0.04),
                searchTerms: ['wireless keyboard mouse combo', 'office keyboard mouse'],
                requirements: ['Wireless', 'Comfortable', 'Long battery']
            },
            {
                category: 'Desk Lamp LED',
                priority: 5,
                budgetAllocation: Math.round(budget * 0.02),
                searchTerms: ['led desk lamp', 'office desk lamp', 'adjustable desk lamp'],
                requirements: ['Adjustable', 'LED', 'Eye-friendly']
            },
            {
                category: 'Office Storage Solutions',
                priority: 4,
                budgetAllocation: Math.round(budget * 0.02),
                searchTerms: ['office storage', 'desk organizer', 'filing cabinet'],
                requirements: ['Organization', 'Space-saving', 'Durable']
            }
        ]

        return this.buildPlanResponse(categories, request)
    }

    /**
     * Create other setup fallbacks (bedroom, kitchen, living room)
     */
    private createBedroomFallback(request: PlanRequest): PlanResponse {
        // Implementation for bedroom - comprehensive list
        return this.createGamingFallback(request) // Temporary fallback
    }

    private createKitchenFallback(request: PlanRequest): PlanResponse {
        // Implementation for kitchen - comprehensive list
        return this.createGamingFallback(request) // Temporary fallback
    }

    private createLivingRoomFallback(request: PlanRequest): PlanResponse {
        // Implementation for living room - comprehensive list
        return this.createGamingFallback(request) // Temporary fallback
    }

    private createGeneralSetupFallback(request: PlanRequest): PlanResponse {
        // Implementation for general setup
        return this.createGamingFallback(request) // Temporary fallback
    }

    private createSingleItemFallback(request: PlanRequest): PlanResponse {
        const categories: CategoryPlan[] = [
            {
                category: request.query,
                priority: 10,
                budgetAllocation: request.budget,
                searchTerms: [request.query],
                requirements: ['Within budget', 'Good quality', 'Good reviews']
            }
        ]

        return this.buildPlanResponse(categories, request)
    }

    /**
     * Build plan response from categories
     */
    private buildPlanResponse(categories: CategoryPlan[], request: PlanRequest): PlanResponse {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#FFA07A', '#98D8C8', '#F7DC6F', '#DDA0DD']

        const budgetDistribution: BudgetDistribution[] = categories.map((cat, index) => ({
            category: cat.category,
            amount: cat.budgetAllocation,
            percentage: Math.round((cat.budgetAllocation / request.budget) * 100),
            color: colors[index % colors.length]
        }))

        const searchStrategy: SearchStrategy = {
            approach: 'setup',
            categories: categories.map(c => c.category),
            totalItems: categories.length
        }

        return {
            categories,
            budgetDistribution,
            searchStrategy
        }
    }
}

// Factory function to create enhanced Gemini AI client
export function createEnhancedGeminiAIClient(): EnhancedGeminiAIClient {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new ExternalAPIError('GEMINI_API_KEY environment variable is not set', 'MISSING_API_KEY', false)
    }
    return new EnhancedGeminiAIClient(apiKey)
}

// Enhanced convenience function
export async function generateEnhancedPlan(request: PlanRequest): Promise<PlanResponse> {
    const client = createEnhancedGeminiAIClient()
    return client.generatePlan(request)
}
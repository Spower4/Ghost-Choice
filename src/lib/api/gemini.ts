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

// Gemini AI client for planning and ranking
export class GeminiAIClient {
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
   * Generate a setup plan using Gemini AI
   */
  async generatePlan(request: PlanRequest): Promise<PlanResponse> {
    try {
      const prompt = this.buildPlanningPrompt(request)
      const result = await withRetry(() => this.generateContent(prompt))

      return this.parsePlanResponse(result, request)
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error // Let the build route handle 429 errors
      }
      if (error instanceof ExternalAPIError) {
        throw error
      }
      throw handleFetchError(error, 'Gemini AI planning')
    }
  }

  /**
   * Rank products using enhanced context-aware Gemini AI
   */
  async rankProducts(request: RankRequest, existingProducts?: Product[]): Promise<RankResponse> {
    try {
      const prompt = this.buildContextAwareRankingPrompt(request, existingProducts)
      const result = await withRetry(() => this.generateContent(prompt))

      return this.parseRankResponse(result, request.products)
    } catch (error) {
      // Fallback to enhanced heuristic ranking if AI fails
      console.warn('Gemini AI ranking failed, falling back to enhanced heuristic ranking:', error)
      return this.enhancedHeuristicRanking(request, existingProducts)
    }
  }

  /**
   * Select best product from search results using context-aware Gemini AI
   */
  async selectBestProduct(
    need: { name: string; targetPrice: number; specs?: any },
    products: RawProduct[],
    context: { budget: number; style: string; region: string },
    existingProducts?: Product[]
  ): Promise<Product | null> {
    try {
      if (products.length === 0) return null

      const prompt = this.buildContextAwareProductSelectionPrompt(need, products, context, existingProducts)
      const result = await withRetry(() => this.generateContent(prompt))

      return this.parseProductSelection(result, products, need)
    } catch (error) {
      console.warn('Gemini AI product selection failed, using enhanced fallback:', error)
      return this.selectEnhancedProductFallback(need, products, existingProducts)
    }
  }

  /**
   * Generate ghost tips based on search context
   */
  async generateGhostTips(query: string, products: Product[], context?: string): Promise<string[]> {
    try {
      const prompt = this.buildGhostTipsPrompt(query, products, context)
      const result = await withRetry(() => this.generateContent(prompt))

      return this.parseGhostTips(result)
    } catch (error) {
      console.warn('Ghost tips generation failed, using fallback tips:', error)
      return this.getFallbackTips(query)
    }
  }

  /**
   * Build planning prompt for Gemini AI (slimmed down)
   */
  private buildPlanningPrompt(request: PlanRequest): string {
    return `Create a ${request.style.toLowerCase()} product plan for "${request.query}" with $${request.budget} budget.

Return JSON only:
{
  "approach": "setup" | "single",
  "categories": [
    {
      "category": "string",
      "priority": 1-10,
      "budgetAllocation": number,
      "searchTerms": ["term1", "term2"],
      "requirements": ["req1", "req2"]
    }
  ],
  "budgetDistribution": [
    {
      "category": "string",
      "amount": number,
      "percentage": number,
      "color": "#FF6B6B"
    }
  ],
  "totalItems": number
}

Rules:
- Setup: 3-8 categories for room/workspace queries
- Single: 1-3 variations for specific items
- Budget must total ${request.budget}
- Use colors: #FF6B6B, #4ECDC4, #45B7D1, #96CEB4`
  }

  /**
   * Build ranking prompt for Gemini AI (slimmed down)
   */
  private buildRankingPrompt(request: RankRequest): string {
    const { products, criteria, userPreferences } = request

    // Only include top 8 products to reduce token usage
    const topProducts = products.slice(0, 8)
    const productsText = topProducts.map((p, i) =>
      `${i + 1}. ${p.title} - $${p.price || 0} - ${p.rating || 0}⭐ (${p.reviewCount || 0} reviews)`
    ).join('\n')

    return `Rank these products for ${userPreferences.style.toLowerCase()} user with $${userPreferences.budget} budget:

${productsText}

Return JSON:
{
  "rankings": [
    {
      "productIndex": number,
      "score": number,
      "rationale": "brief explanation",
      "pros": ["pro1", "pro2"],
      "cons": ["con1"],
      "confidence": 0.0-1.0
    }
  ],
  "reasoning": ["point1", "point2"]
}`
  }

  /**
   * Build context-aware ranking prompt for Gemini AI with existing products consideration
   */
  private buildContextAwareRankingPrompt(request: RankRequest, existingProducts?: Product[]): string {
    const { products, criteria, userPreferences } = request

    // Only include top 10 products to reduce token usage
    const topProducts = products.slice(0, 10)
    const productsText = topProducts.map((p, i) =>
      `${i + 1}. "${p.title}" - $${p.price || 0} - ${p.rating || 0}⭐ (${p.reviewCount || 0} reviews) - ${p.merchant || 'Unknown'}`
    ).join('\n')

    // Build context from existing products
    let contextSection = ''
    if (existingProducts && existingProducts.length > 0) {
      const existingText = existingProducts.map(p =>
        `• ${p.category || 'Product'}: "${p.title}" - $${p.price} - ${p.rating}⭐ - ${p.merchant}`
      ).join('\n')

      contextSection = `
EXISTING PRODUCTS IN SETUP:
${existingText}

COMPATIBILITY ANALYSIS REQUIRED:
- Consider how new products complement existing ones
- Avoid redundant functionality unless upgrading
- Ensure style/aesthetic consistency (${userPreferences.style})
- Check for technical compatibility (ports, power, space)
- Consider brand ecosystem benefits
- Evaluate if this fills a gap in the current setup
- Assess if this creates a more cohesive user experience

`
    }

    return `You are an expert product analyst ranking products for a ${userPreferences.style.toLowerCase()} user with $${userPreferences.budget} total budget.

${contextSection}PRODUCTS TO RANK:
${productsText}

RANKING CRITERIA (weights):
- Price Value: ${criteria.priceWeight * 100}% - Best value for money within budget
- Rating Quality: ${criteria.ratingWeight * 100}% - User satisfaction and reliability
- Review Count: ${criteria.reviewWeight * 100}% - Product popularity and trust
- Relevance: ${criteria.relevanceWeight * 100}% - Fit for user needs and style
${existingProducts ? '- Compatibility: 20% - How well it works with existing products' : ''}

ANALYSIS REQUIREMENTS:
1. Score each product 0-100 based on weighted criteria
2. Consider setup coherence and compatibility
3. Identify specific pros and cons
4. Assess confidence in recommendation
5. Explain reasoning for ranking decisions

Return JSON:
{
  "rankings": [
    {
      "productIndex": number,
      "score": number,
      "rationale": "Detailed explanation of why this product ranks here, considering existing setup",
      "pros": ["specific advantage 1", "compatibility benefit 2", "value proposition 3"],
      "cons": ["limitation 1", "potential issue 2"],
      "confidence": 0.0-1.0,
      "compatibilityScore": 0.0-1.0,
      "valueScore": 0.0-1.0
    }
  ],
  "reasoning": ["Overall ranking strategy", "Key decision factors", "Setup coherence considerations"]
}`
  }

  /**
   * Build ghost tips prompt (slimmed down)
   */
  private buildGhostTipsPrompt(query: string, products: Product[], context?: string): string {
    return `Generate 3 helpful tips for "${query}" search. Return JSON array: ["tip1", "tip2", "tip3"]`
  }

  /**
   * Build context-aware product selection prompt
   */
  private buildContextAwareProductSelectionPrompt(
    need: { name: string; targetPrice: number; specs?: any },
    products: RawProduct[],
    context: { budget: number; style: string; region: string },
    existingProducts?: Product[]
  ): string {
    const productsText = products.slice(0, 12).map((p, i) =>
      `${i + 1}. "${p.title}" - $${p.price || 0} - ${p.rating || 0}⭐ (${p.reviewCount || 0} reviews) - ${p.merchant || 'Unknown'}`
    ).join('\n')

    // Build context from existing products
    let contextSection = ''
    if (existingProducts && existingProducts.length > 0) {
      const existingText = existingProducts.map(p =>
        `• ${p.category || 'Product'}: "${p.title}" - $${p.price} - ${p.rating}⭐ - ${p.merchant}`
      ).join('\n')

      contextSection = `
EXISTING PRODUCTS IN SETUP:
${existingText}

COMPATIBILITY REQUIREMENTS:
- Must complement existing products, not duplicate functionality
- Should match ${context.style} aesthetic and quality level
- Consider brand ecosystem benefits (same brand = bonus points)
- Ensure technical compatibility (ports, power, space requirements)
- Maintain consistent quality tier across all products
- Fill gaps in the current setup rather than redundant items

`
    }

    return `You are selecting the BEST ${need.name} for a ${context.style.toLowerCase()} setup with $${context.budget} total budget.

${contextSection}TARGET: ${need.name} with budget of $${need.targetPrice}
AVAILABLE OPTIONS:
${productsText}

SELECTION CRITERIA (in priority order):
1. Budget Fit: Must be ≤ $${need.targetPrice}
2. Value Proposition: Best price-to-quality ratio
3. Quality Indicators: High rating (4.0+) with good review count (100+)
4. Style Match: Appropriate for ${context.style.toLowerCase()} aesthetic
5. Merchant Reliability: Trusted seller with good shipping
${existingProducts ? '6. Setup Compatibility: Works well with existing products' : ''}
${existingProducts ? '7. Brand Consistency: Bonus for matching existing brands' : ''}

ANALYSIS REQUIREMENTS:
- Evaluate each product against all criteria
- Consider long-term value and durability
- Assess compatibility with existing setup
- Identify the single best choice with detailed reasoning

Return JSON:
{
  "selectedIndex": number,
  "rationale": "Comprehensive explanation of why this is the optimal choice for the setup",
  "pros": ["specific advantage 1", "compatibility benefit 2", "value proposition 3"],
  "cons": ["limitation 1", "potential concern 2"],
  "confidence": 0.0-1.0,
  "valueScore": 0.0-1.0,
  "compatibilityScore": 0.0-1.0,
  "setupCoherence": "How this product enhances the overall setup"
}

If no product fits the budget or requirements, return: {"selectedIndex": -1, "rationale": "No suitable products meet the criteria"}`
  }

  /**
   * Build product selection prompt for choosing best product from search results (legacy)
   */
  private buildProductSelectionPrompt(
    need: { name: string; targetPrice: number; specs?: any },
    products: RawProduct[],
    context: { budget: number; style: string; region: string }
  ): string {
    return this.buildContextAwareProductSelectionPrompt(need, products, context)
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

      // Handle new format with needs array
      if (parsed.needs && Array.isArray(parsed.needs)) {
        const categories: CategoryPlan[] = parsed.needs.map((need: any) => ({
          category: need.name,
          priority: need.priority || 5,
          budgetAllocation: need.targetPrice,
          searchTerms: [need.name],
          requirements: [need.rationale || '']
        }))

        const budgetDistribution: BudgetDistribution[] = parsed.needs.map((need: any, index: number) => {
          const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD']
          return {
            category: need.name,
            amount: need.targetPrice,
            percentage: Math.round((need.targetPrice / request.budget) * 100),
            color: colors[index % colors.length]
          }
        })

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

      // Handle old format with categories array (fallback)
      const categories: CategoryPlan[] = (parsed.categories || []).map((cat: any) => ({
        category: cat.category,
        priority: Math.max(1, Math.min(10, cat.priority)),
        budgetAllocation: Math.max(0, cat.budgetAllocation),
        searchTerms: Array.isArray(cat.searchTerms) ? cat.searchTerms : [cat.category],
        requirements: Array.isArray(cat.requirements) ? cat.requirements : []
      }))

      const budgetDistribution: BudgetDistribution[] = (parsed.budgetDistribution || []).map((dist: any) => ({
        category: dist.category,
        amount: Math.max(0, dist.amount),
        percentage: Math.max(0, Math.min(100, dist.percentage)),
        color: this.validateColor(dist.color)
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
      console.warn('Failed to parse Gemini planning response, using fallback:', error)
      return this.getFallbackPlan(request)
    }
  }

  /**
   * Parse ranking response from Gemini AI
   */
  private parseRankResponse(response: string, originalProducts: RawProduct[]): RankResponse {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        response.match(/(\{[\s\S]*\})/)

      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[1])

      // Convert rankings to ranked products
      const rankedProducts: Product[] = parsed.rankings
        .sort((a: any, b: any) => b.score - a.score)
        .map((ranking: any, index: number) => {
          const originalProduct = originalProducts[ranking.productIndex]
          if (!originalProduct) return null

          return {
            id: originalProduct.id,
            title: originalProduct.title,
            price: originalProduct.price || 0,
            currency: originalProduct.currency || 'USD',
            merchant: originalProduct.merchant || 'Unknown',
            rating: originalProduct.rating || 0,
            reviewCount: originalProduct.reviewCount || 0,
            imageUrl: this.validateImageUrl(originalProduct.image) || this.generatePlaceholderImage(originalProduct.title, originalProduct.category || 'Product'),
            productUrl: originalProduct.url || '#',
            rationale: ranking.rationale || 'AI-powered recommendation',
            category: originalProduct.category,
            features: [],
            pros: ranking.pros || [],
            cons: ranking.cons || [],
            confidence: Math.max(0, Math.min(1, ranking.confidence || 0.8)),
            searchRank: index + 1
          }
        })
        .filter(Boolean)

      return {
        rankedProducts,
        reasoning: parsed.reasoning || ['AI-powered ranking based on multiple criteria']
      }
    } catch (error) {
      console.warn('Failed to parse Gemini ranking response, using fallback:', error)
      // Create a fallback request with default values
      const fallbackRequest: RankRequest = {
        products: originalProducts,
        criteria: {
          priceWeight: 0.25,
          ratingWeight: 0.25,
          reviewWeight: 0.25,
          relevanceWeight: 0.25
        },
        userPreferences: {
          style: 'Casual',
          budget: 1000,
          prioritizeRating: false
        }
      }
      return this.heuristicRanking(fallbackRequest)
    }
  }

  /**
   * Parse ghost tips from AI response
   */
  private parseGhostTips(response: string): string[] {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) ||
        response.match(/(\[[\s\S]*\])/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 5) // Max 5 tips
        }
      }

      // Fallback: extract tips from text
      const lines = response.split('\n').filter(line =>
        line.trim() && !line.includes('```') && line.length < 150
      )

      return lines.slice(0, 3)
    } catch (error) {
      return this.getFallbackTips()
    }
  }

  /**
   * Parse product selection response from Gemini AI
   */
  private parseProductSelection(response: string, products: RawProduct[], need: { name: string; targetPrice: number }): Product | null {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        response.match(/(\{[\s\S]*\})/)

      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[1])

      if (parsed.selectedIndex === -1 || parsed.selectedIndex >= products.length) {
        return null // No suitable product found
      }

      const selectedProduct = products[parsed.selectedIndex]

      return {
        id: selectedProduct.id,
        title: selectedProduct.title,
        price: selectedProduct.price || 0,
        currency: selectedProduct.currency || 'USD',
        merchant: selectedProduct.merchant || 'Unknown',
        rating: selectedProduct.rating || 0,
        reviewCount: selectedProduct.reviewCount || 0,
        imageUrl: this.validateImageUrl(selectedProduct.image) || this.generatePlaceholderImage(selectedProduct.title, need.name),
        productUrl: selectedProduct.url || '#',
        rationale: parsed.rationale || 'AI-selected best option',
        category: need.name,
        features: [],
        pros: parsed.pros || [],
        cons: parsed.cons || [],
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
        searchRank: parsed.selectedIndex + 1
      }
    } catch (error) {
      console.warn('Failed to parse product selection response:', error)
      return null
    }
  }

  /**
   * Enhanced fallback product selection with context awareness
   */
  private selectEnhancedProductFallback(
    need: { name: string; targetPrice: number },
    products: RawProduct[],
    existingProducts?: Product[]
  ): Product | null {
    // Filter products within budget
    const budgetFiltered = products.filter(p => p.price && p.price <= need.targetPrice)

    if (budgetFiltered.length === 0) return null

    // Score products with compatibility consideration
    const scored = budgetFiltered.map(p => {
      const baseScore = ((p.rating || 0) * Math.log((p.reviewCount || 0) + 1)) / Math.max(p.price || 1, 1)

      let compatibilityBonus = 0
      if (existingProducts && existingProducts.length > 0) {
        // Brand consistency bonus
        const productBrand = this.extractBrand(p.title)
        const existingBrands = existingProducts.map(ep => this.extractBrand(ep.title))
        if (productBrand && existingBrands.includes(productBrand)) {
          compatibilityBonus += 0.2
        }

        // Merchant consistency bonus
        const existingMerchants = existingProducts.map(ep => ep.merchant)
        if (p.merchant && existingMerchants.includes(p.merchant)) {
          compatibilityBonus += 0.1
        }

        // Quality tier consistency
        const avgExistingRating = existingProducts.reduce((sum, ep) => sum + ep.rating, 0) / existingProducts.length
        const ratingDiff = Math.abs((p.rating || 0) - avgExistingRating)
        if (ratingDiff <= 0.5) {
          compatibilityBonus += 0.15
        }
      }

      return {
        product: p,
        score: baseScore + compatibilityBonus
      }
    })

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0].product

    return {
      id: best.id,
      title: best.title,
      price: best.price || 0,
      currency: best.currency || 'USD',
      merchant: best.merchant || 'Unknown',
      rating: best.rating || 0,
      reviewCount: best.reviewCount || 0,
      imageUrl: this.validateImageUrl(best.image) || this.generatePlaceholderImage(best.title, need.name),
      productUrl: best.url || '#',
      rationale: this.generateEnhancedSelectionRationale(best, existingProducts),
      category: need.name,
      features: [],
      pros: this.generateEnhancedPros(best, existingProducts),
      cons: this.generateEnhancedCons(best, existingProducts),
      confidence: Math.min(0.9, 0.6 + (scored[0].score * 0.1)),
      searchRank: 1
    }
  }

  /**
   * Generate enhanced selection rationale
   */
  private generateEnhancedSelectionRationale(product: RawProduct, existingProducts?: Product[]): string {
    let rationale = 'Selected based on best value for money'

    if (existingProducts && existingProducts.length > 0) {
      const brand = this.extractBrand(product.title)
      const existingBrands = existingProducts.map(p => this.extractBrand(p.title))

      if (brand && existingBrands.includes(brand)) {
        rationale += ` and brand consistency with existing ${brand} products`
      } else {
        rationale += ' and compatibility with existing setup'
      }
    }

    if (product.rating && product.rating >= 4.5) {
      rationale += '. Excellent user ratings indicate high quality'
    } else if (product.rating && product.rating >= 4.0) {
      rationale += '. Good user ratings provide confidence'
    }

    return rationale
  }

  /**
   * Fallback product selection when AI fails (legacy)
   */
  private selectProductFallback(need: { name: string; targetPrice: number }, products: RawProduct[]): Product | null {
    return this.selectEnhancedProductFallback(need, products)
  }
  // Filter products within budget
  /**
   * Validate and normalize color hex codes
   */
  private validateColor(color: string): string {
    const validColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ]

    if (color && /^#[0-9A-F]{6}$/i.test(color)) {
      return color.toUpperCase()
    }

    return validColors[Math.floor(Math.random() * validColors.length)]
  }

  /**
   * Fallback planning when AI fails
   */
  private getFallbackPlan(request: PlanRequest): PlanResponse {
    const isSetup = this.isSetupQuery(request.query)

    if (isSetup) {
      return this.generateSetupFallback(request)
    } else {
      return this.generateSingleItemFallback(request)
    }
  }

  /**
   * Determine if query is for a complete setup
   */
  private isSetupQuery(query: string): boolean {
    const setupKeywords = [
      'setup', 'room', 'office', 'bedroom', 'kitchen', 'living room',
      'gaming', 'workspace', 'studio', 'home', 'apartment'
    ]

    return setupKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    )
  }

  /**
   * Generate fallback setup plan
   */
  private generateSetupFallback(request: PlanRequest): PlanResponse {
    const categories: CategoryPlan[] = [
      {
        category: 'Primary Item',
        priority: 1,
        budgetAllocation: request.budget * 0.4,
        searchTerms: [request.query],
        requirements: ['High quality', 'Good reviews']
      },
      {
        category: 'Secondary Items',
        priority: 2,
        budgetAllocation: request.budget * 0.35,
        searchTerms: [request.query, 'accessories'],
        requirements: ['Compatible', 'Value for money']
      },
      {
        category: 'Accessories',
        priority: 3,
        budgetAllocation: request.budget * 0.25,
        searchTerms: ['accessories', request.query],
        requirements: ['Useful', 'Affordable']
      }
    ]

    const budgetDistribution: BudgetDistribution[] = categories.map((cat, i) => ({
      category: cat.category,
      amount: cat.budgetAllocation,
      percentage: (cat.budgetAllocation / request.budget) * 100,
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1'][i]
    }))

    return {
      categories,
      budgetDistribution,
      searchStrategy: {
        approach: 'setup',
        categories: categories.map(c => c.category),
        totalItems: 3
      }
    }
  }

  /**
   * Generate fallback single item plan
   */
  private generateSingleItemFallback(request: PlanRequest): PlanResponse {
    const categories: CategoryPlan[] = [
      {
        category: request.query,
        priority: 1,
        budgetAllocation: request.budget,
        searchTerms: [request.query],
        requirements: ['Within budget', 'Good quality']
      }
    ]

    const budgetDistribution: BudgetDistribution[] = [{
      category: request.query,
      amount: request.budget,
      percentage: 100,
      color: '#FF6B6B'
    }]

    return {
      categories,
      budgetDistribution,
      searchStrategy: {
        approach: 'single',
        categories: [request.query],
        totalItems: 1
      }
    }
  }

  /**
   * Enhanced heuristic ranking with context awareness
   */
  private enhancedHeuristicRanking(request: RankRequest, existingProducts?: Product[]): RankResponse {
    const { products, criteria, userPreferences } = request

    const scoredProducts = products.map((product, index) => {
      // Normalize inputs to avoid NaN
      const price = Number.isFinite(product.price) ? product.price! :
        Math.min(userPreferences.budget * 0.6, userPreferences.budget || 1000)
      const rating = Number.isFinite(product.rating) ? product.rating! : 0
      const reviewCount = Number.isFinite(product.reviewCount) ? product.reviewCount! : 0

      // Calculate base scores
      const priceScore = this.calculatePriceScore(price, userPreferences.budget)
      const ratingScore = Math.max(0, Math.min(1, rating / 5))
      const reviewScore = Math.max(0, Math.min(1, reviewCount / 1000))
      const relevanceScore = 0.8 // Default relevance

      // Calculate compatibility score if existing products provided
      let compatibilityScore = 0.8 // Default neutral compatibility
      let compatibilityBonus = 0

      if (existingProducts && existingProducts.length > 0) {
        compatibilityScore = this.calculateCompatibilityScore(product, existingProducts, userPreferences)
        compatibilityBonus = compatibilityScore * 0.2 // 20% bonus for compatibility
      }

      const baseScore =
        (priceScore * criteria.priceWeight) +
        (ratingScore * criteria.ratingWeight) +
        (reviewScore * criteria.reviewWeight) +
        (relevanceScore * criteria.relevanceWeight)

      const totalScore = baseScore + compatibilityBonus

      return {
        id: product.id,
        title: product.title,
        price: price,
        currency: product.currency || 'USD',
        merchant: product.merchant || 'Unknown',
        rating: rating,
        reviewCount: reviewCount,
        imageUrl: this.validateImageUrl(product.image) || this.generatePlaceholderImage(product.title, product.category || 'Product'),
        productUrl: product.url || '#',
        rationale: this.generateEnhancedRationale(product, totalScore, compatibilityScore, existingProducts),
        category: product.category,
        features: [],
        pros: this.generateEnhancedPros(product, existingProducts),
        cons: this.generateEnhancedCons(product, existingProducts),
        confidence: Math.min(0.9, 0.6 + (totalScore * 0.3)), // Higher confidence for better scores
        searchRank: index + 1
      }
    })

    // Sort by total score (highest first)
    const rankedProducts = scoredProducts.sort((a, b) => {
      const scoreA = this.calculateEnhancedHeuristicScore(a, criteria, userPreferences, existingProducts)
      const scoreB = this.calculateEnhancedHeuristicScore(b, criteria, userPreferences, existingProducts)
      return scoreB - scoreA
    })

    const reasoning = [
      'Enhanced ranking using compatibility-aware algorithm',
      existingProducts ? 'Considered compatibility with existing products in setup' : 'Ranked based on price, rating, and review count',
      `Optimized for ${userPreferences.style.toLowerCase()} style preferences`
    ]

    return {
      rankedProducts,
      reasoning
    }
  }

  /**
   * Calculate compatibility score between new product and existing products
   */
  private calculateCompatibilityScore(product: RawProduct, existingProducts: Product[], userPreferences: any): number {
    let compatibilityScore = 0.5 // Start with neutral
    let factors = 0

    // Brand ecosystem bonus
    const productBrand = this.extractBrand(product.title)
    const existingBrands = existingProducts.map(p => this.extractBrand(p.title))
    if (productBrand && existingBrands.includes(productBrand)) {
      compatibilityScore += 0.2
      factors++
    }

    // Merchant consistency bonus
    const existingMerchants = existingProducts.map(p => p.merchant)
    if (product.merchant && existingMerchants.includes(product.merchant)) {
      compatibilityScore += 0.1
      factors++
    }

    // Style consistency
    if (userPreferences.style === 'Premium') {
      // Premium products should have higher prices and ratings
      const avgExistingPrice = existingProducts.reduce((sum, p) => sum + p.price, 0) / existingProducts.length
      const productPrice = product.price || 0
      if (productPrice >= avgExistingPrice * 0.8) {
        compatibilityScore += 0.15
        factors++
      }
    }

    // Rating consistency - products should have similar quality levels
    const avgExistingRating = existingProducts.reduce((sum, p) => sum + p.rating, 0) / existingProducts.length
    const productRating = product.rating || 0
    const ratingDiff = Math.abs(productRating - avgExistingRating)
    if (ratingDiff <= 0.5) {
      compatibilityScore += 0.15
      factors++
    }

    // Avoid redundancy - check if similar category already exists
    const productCategory = this.categorizeProduct(product.title)
    const existingCategories = existingProducts.map(p => this.categorizeProduct(p.title))
    if (!existingCategories.includes(productCategory)) {
      compatibilityScore += 0.1 // Bonus for filling gaps
      factors++
    } else {
      compatibilityScore -= 0.1 // Penalty for redundancy
    }

    return Math.max(0, Math.min(1, compatibilityScore))
  }

  /**
   * Validate image URLs
   */
  private validateImageUrl(url: string | undefined): string | null {
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

  /**
   * Generate category-specific placeholder images
   */
  private generatePlaceholderImage(title: string, category: string): string {
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

  /**
   * Extract brand from product title
   */
  private extractBrand(title: string): string | null {
    const commonBrands = [
      'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer',
      'Microsoft', 'Logitech', 'Razer', 'Corsair', 'SteelSeries', 'HyperX',
      'IKEA', 'Herman Miller', 'Steelcase', 'Amazon', 'Google', 'Philips'
    ]

    const lowerTitle = title.toLowerCase()
    for (const brand of commonBrands) {
      if (lowerTitle.includes(brand.toLowerCase())) {
        return brand
      }
    }
    return null
  }

  /**
   * Categorize product based on title
   */
  private categorizeProduct(title: string): string {
    const lowerTitle = title.toLowerCase()

    if (lowerTitle.includes('monitor') || lowerTitle.includes('display') || lowerTitle.includes('screen')) return 'monitor'
    if (lowerTitle.includes('keyboard')) return 'keyboard'
    if (lowerTitle.includes('mouse')) return 'mouse'
    if (lowerTitle.includes('chair')) return 'chair'
    if (lowerTitle.includes('desk')) return 'desk'
    if (lowerTitle.includes('headset') || lowerTitle.includes('headphone')) return 'audio'
    if (lowerTitle.includes('laptop') || lowerTitle.includes('computer') || lowerTitle.includes('pc')) return 'computer'
    if (lowerTitle.includes('speaker')) return 'speaker'
    if (lowerTitle.includes('webcam') || lowerTitle.includes('camera')) return 'camera'
    if (lowerTitle.includes('microphone') || lowerTitle.includes('mic')) return 'microphone'

    return 'other'
  }

  /**
   * Generate enhanced rationale considering compatibility
   */
  private generateEnhancedRationale(product: RawProduct, score: number, compatibilityScore: number, existingProducts?: Product[]): string {
    const baseRationale = `Scored ${(score * 100).toFixed(0)}/100 based on price, rating, and reviews`

    if (!existingProducts || existingProducts.length === 0) {
      return baseRationale
    }

    const compatibilityText = compatibilityScore > 0.7 ? 'excellent' :
      compatibilityScore > 0.5 ? 'good' : 'moderate'

    return `${baseRationale}. Shows ${compatibilityText} compatibility with existing setup (${(compatibilityScore * 100).toFixed(0)}% match)`
  }

  /**
   * Generate enhanced pros considering existing products
   */
  private generateEnhancedPros(product: RawProduct, existingProducts?: Product[]): string[] {
    const pros = this.generatePros(product)

    if (existingProducts && existingProducts.length > 0) {
      const brand = this.extractBrand(product.title)
      const existingBrands = existingProducts.map(p => this.extractBrand(p.title))

      if (brand && existingBrands.includes(brand)) {
        pros.push('Brand ecosystem compatibility')
      }

      const category = this.categorizeProduct(product.title)
      const existingCategories = existingProducts.map(p => this.categorizeProduct(p.title))

      if (!existingCategories.includes(category)) {
        pros.push('Fills gap in current setup')
      }

      if (product.merchant && existingProducts.some(p => p.merchant === product.merchant)) {
        pros.push('Consistent shopping experience')
      }
    }

    return pros.slice(0, 4) // Limit to 4 pros
  }

  /**
   * Generate enhanced cons considering existing products
   */
  private generateEnhancedCons(product: RawProduct, existingProducts?: Product[]): string[] {
    const cons = this.generateCons(product)

    if (existingProducts && existingProducts.length > 0) {
      const category = this.categorizeProduct(product.title)
      const existingCategories = existingProducts.map(p => this.categorizeProduct(p.title))

      if (existingCategories.includes(category)) {
        cons.push('May be redundant with existing items')
      }

      const brand = this.extractBrand(product.title)
      const existingBrands = existingProducts.map(p => this.extractBrand(p.title))

      if (brand && !existingBrands.includes(brand)) {
        cons.push('Different brand from existing setup')
      }
    }

    return cons.slice(0, 3) // Limit to 3 cons
  }

  /**
   * Calculate enhanced heuristic score with compatibility
   */
  private calculateEnhancedHeuristicScore(product: any, criteria: any, preferences: any, existingProducts?: Product[]): number {
    const baseScore = this.calculateHeuristicScore(product, criteria, preferences)

    if (!existingProducts || existingProducts.length === 0) {
      return baseScore
    }

    const compatibilityScore = this.calculateCompatibilityScore(product, existingProducts, preferences)
    return baseScore + (compatibilityScore * 0.2) // 20% compatibility bonus
  }

  /**
   * Heuristic ranking fallback when AI fails (fixed to avoid NaN)
   */
  private heuristicRanking(request: RankRequest): RankResponse {
    const { products, criteria, userPreferences } = request

    const scoredProducts = products.map((product, index) => {
      // Normalize inputs to avoid NaN
      const price = Number.isFinite(product.price) ? product.price! :
        Math.min(userPreferences.budget * 0.6, userPreferences.budget || 1000)
      const rating = Number.isFinite(product.rating) ? product.rating! : 0
      const reviewCount = Number.isFinite(product.reviewCount) ? product.reviewCount! : 0

      // Calculate heuristic score with safe values
      const priceScore = this.calculatePriceScore(price, userPreferences.budget)
      const ratingScore = Math.max(0, Math.min(1, rating / 5))
      const reviewScore = Math.max(0, Math.min(1, reviewCount / 1000))
      const relevanceScore = 0.8 // Default relevance

      const totalScore =
        (priceScore * criteria.priceWeight) +
        (ratingScore * criteria.ratingWeight) +
        (reviewScore * criteria.reviewWeight) +
        (relevanceScore * criteria.relevanceWeight)

      return {
        id: product.id,
        title: product.title,
        price: price,
        currency: product.currency || 'USD',
        merchant: product.merchant || 'Unknown',
        rating: rating,
        reviewCount: reviewCount,
        imageUrl: this.validateImageUrl(product.image) || this.generatePlaceholderImage(product.title, product.category || 'Product'),
        productUrl: product.url || '#',
        rationale: `Scored ${(totalScore * 100).toFixed(0)}/100 based on price, rating, and reviews`,
        category: product.category,
        features: [],
        pros: this.generatePros({ ...product, rating, reviewCount }),
        cons: this.generateCons({ ...product, rating, reviewCount }),
        confidence: 0.7,
        searchRank: index + 1
      }
    })

    // Sort by score (highest first)
    const rankedProducts = scoredProducts.sort((a, b) => {
      const scoreA = this.calculateHeuristicScore(a, criteria, userPreferences)
      const scoreB = this.calculateHeuristicScore(b, criteria, userPreferences)
      return scoreB - scoreA
    })

    return {
      rankedProducts,
      reasoning: ['Ranked using heuristic algorithm based on price, rating, and review count']
    }
  }

  /**
   * Calculate price score (lower price = higher score, but not too cheap)
   */
  private calculatePriceScore(price: number | undefined, budget: number | undefined): number {
    const b = Number.isFinite(budget) && budget! > 0 ? budget! : 1000
    if (!Number.isFinite(price)) return 0.6 // neutral if price missing

    if (price! > b) return 0
    if (price! < b * 0.1) return 0.3 // Too cheap might be low quality

    const ratio = price! / b
    return Math.max(0, Math.min(1, 1 - (ratio * 0.7))) // Sweet spot around 30-70% of budget
  }

  /**
   * Calculate heuristic score for sorting
   */
  private calculateHeuristicScore(product: any, criteria: any, preferences: any): number {
    const priceScore = this.calculatePriceScore(product.price, preferences.budget)
    const ratingScore = Math.max(0, Math.min(1, (product.rating || 0) / 5))
    const reviewScore = Math.max(0, Math.min(1, (product.reviewCount || 0) / 1000))
    const relevanceScore = 0.8

    return (priceScore * criteria.priceWeight) +
      (ratingScore * criteria.ratingWeight) +
      (reviewScore * criteria.reviewWeight) +
      (relevanceScore * criteria.relevanceWeight)
  }

  /**
   * Generate pros based on product data
   */
  private generatePros(product: RawProduct): string[] {
    const pros: string[] = []
    const r = Number.isFinite(product.rating) ? product.rating! : 0
    const rc = Number.isFinite(product.reviewCount) ? product.reviewCount! : 0

    if (r >= 4.5) pros.push('Excellent rating')
    else if (r >= 4.0) pros.push('Good rating')

    if (rc >= 1000) pros.push('Well-reviewed')
    else if (rc >= 100) pros.push('Decent review count')

    if (product.merchant === 'Amazon') pros.push('Fast shipping available')

    return pros.slice(0, 3)
  }

  /**
   * Generate cons based on product data
   */
  private generateCons(product: RawProduct): string[] {
    const cons: string[] = []
    const r = Number.isFinite(product.rating) ? product.rating! : 0
    const rc = Number.isFinite(product.reviewCount) ? product.reviewCount! : 0

    if (r < 3.5) cons.push('Lower rating')
    if (rc < 50) cons.push('Limited reviews')

    return cons.slice(0, 2)
  }

  /**
   * Get fallback ghost tips
   */
  private getFallbackTips(query?: string): string[] {
    const tips = [
      "Looking for the best deals! 👻",
      "Check product reviews before buying",
      "Compare prices across merchants",
      "Free shipping can save you money",
      "Higher ratings usually mean better quality"
    ]

    if (query) {
      tips.unshift(`Searching for "${query}" products...`)
    }

    return tips.slice(0, 3)
  }
}

// Factory function to create Gemini AI client
export function createGeminiAIClient(): GeminiAIClient {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ExternalAPIError('GEMINI_API_KEY environment variable is not set', 'MISSING_API_KEY', false)
  }
  return new GeminiAIClient(apiKey)
}

// Convenience functions
export async function generatePlan(request: PlanRequest): Promise<PlanResponse> {
  const client = createGeminiAIClient()
  return client.generatePlan(request)
}

export async function rankProducts(request: RankRequest, existingProducts?: Product[]): Promise<RankResponse> {
  const client = createGeminiAIClient()
  return client.rankProducts(request, existingProducts)
}

export async function generateGhostTips(query: string, products: Product[], context?: string): Promise<string[]> {
  const client = createGeminiAIClient()
  return client.generateGhostTips(query, products, context)
}

export async function selectBestProduct(
  need: { name: string; targetPrice: number; specs?: any },
  products: RawProduct[],
  context: { budget: number; style: string; region: string },
  existingProducts?: Product[]
): Promise<Product | null> {
  const client = createGeminiAIClient()
  return client.selectBestProduct(need, products, context, existingProducts)
}

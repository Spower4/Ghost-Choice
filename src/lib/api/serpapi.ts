import { SearchRequest, SearchResponse, RawProduct } from '@/types/api'
import { ExternalAPIError, RateLimitError, handleFetchError } from '@/lib/errors'
import { getRegionFromCurrency, getCountryCodeFromCurrency } from '@/lib/currency'

// SerpAPI specific types
interface SerpAPIProduct {
  position?: number
  title: string
  link?: string
  product_link?: string           // SerpAPI uses product_link instead of link
  price?: string                  // "$119.99"
  extracted_price?: number        // 119.99
  currency?: string               // "USD"
  rating?: number
  reviews?: number
  thumbnail?: string
  source?: string
  delivery?: string
  extensions?: string[]
}

interface SerpAPIResponse {
  search_metadata?: {
    id: string
    status: string
    json_endpoint: string
    created_at: string
    processed_at: string
    google_url: string
    raw_html_file: string
    total_time_taken: number
  }
  search_parameters?: {
    engine: string
    q: string
    location_requested: string
    location_used: string
    google_domain: string
    hl: string
    gl: string
    device: string
  }
  search_information?: {
    organic_results_state: string
    query_displayed: string
    total_results?: number
  }
  shopping_results?: SerpAPIProduct[]
  error?: string
}

// Currency mapping
const CURRENCY_MAPPING = {
  'US': 'USD',
  'UK': 'GBP',
  'EU': 'EUR',
  'IN': 'INR',
  'CA': 'CAD',
  'AU': 'AUD'
}

export class SerpAPIClient {
  private readonly apiKey: string
  private readonly baseURL = 'https://serpapi.com/search.json'

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new ExternalAPIError('SerpAPI key is required', 'MISSING_API_KEY', false)
    }
    this.apiKey = apiKey
  }

  async searchProducts(request: SearchRequest): Promise<SearchResponse> {
    try {
      const url = this.buildSearchURL(request)
      console.log('SerpAPI request URL:', url)
      console.log('SerpAPI query terms:', request.query)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GhostSetupFinder/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new ExternalAPIError('SerpAPI key invalid', 'SERPAPI_KEY_INVALID', false)
        }
        if (response.status === 429) {
          throw new RateLimitError('SerpAPI quota exceeded', 'SERPAPI_RATE_LIMIT')
        }
        throw new ExternalAPIError(
          `SerpAPI request failed: ${response.statusText}`,
          `SERPAPI_${response.status}`,
          response.status >= 500
        )
      }

      const data = await response.json()

      // Log raw response (first 2 items only for debugging)
      if (data.shopping_results && data.shopping_results.length > 0) {
        console.log('SerpAPI raw response sample:', JSON.stringify(data.shopping_results.slice(0, 2), null, 2))
      } else {
        console.log('SerpAPI response structure:', Object.keys(data))
      }

      if (data.error) {
        throw new ExternalAPIError(`SerpAPI error: ${data.error}`, 'SERPAPI_ERROR', false)
      }

      const region = getRegionFromCurrency(request.currency as any)
      const gl = getCountryCodeFromCurrency(request.currency as any)?.toLowerCase() || 'us'

      // Parse products with URL resolution
      let products = await this.parseProductsWithResolve(data, region, request.amazonOnly, gl)

      // Amazon fallback: if Amazon-only requested and no products found, try Amazon engine
      if (request.amazonOnly && products.length === 0) {
        console.warn('Amazon-only requested, Shopping returned 0 → using Amazon engine fallback')
        products = await this.searchAmazonViaSerp(request.query, region)
      }

      const totalResults = data.search_information?.total_results || products.length

      console.log(`SerpAPI parsed ${products.length} products from ${data.shopping_results?.length || 0} raw results`)

      return {
        products,
        totalResults,
        searchMetadata: {
          totalResults,
          searchTime: data.search_metadata?.total_time_taken || 0,
          currency: request.currency,
          query: request.query
        }
      }
    } catch (error) {
      if (error instanceof ExternalAPIError || error instanceof RateLimitError) {
        throw error
      }
      throw handleFetchError(error, 'SerpAPI search')
    }
  }

  private buildSearchURL(request: SearchRequest): string {
    const params = new URLSearchParams({
      q: this.buildQuery(request),
      engine: 'google_shopping',
      api_key: this.apiKey,
      hl: 'en',
      num: request.limit?.toString() || '15' // Increase limit to get more results for filtering
    })

    // Get country code from currency (lowercase)
    const gl = getCountryCodeFromCurrency(request.currency as any)?.toLowerCase() || 'us'
    params.set('gl', gl)

    // For Amazon-only searches, we'll rely on post-filtering
    // The merchant filter often returns no results due to Amazon's restrictions

    return `${this.baseURL}?${params.toString()}`
  }

  private buildQuery(request: SearchRequest): string {
    let query = request.query.trim()

    // For Amazon-only searches, we'll filter results after getting them
    // instead of using site: restriction which is too restrictive for Google Shopping
    // The filtering happens in parseProducts method

    return query
  }

  /**
   * Resolve missing URLs via google_product API
   */
  private async resolveGoogleProductLink(productIdOrApi: { product_id?: string; serpapi_product_api?: string }, gl: string): Promise<string | null> {
    try {
      // Prefer direct product API if present
      if (productIdOrApi.serpapi_product_api) {
        const j = await fetch(productIdOrApi.serpapi_product_api + `&api_key=${this.apiKey}`).then(r => r.json())
        const seller = j?.sellers_results?.online_sellers?.[0]?.link
        return seller || j?.product_link || null
      }

      // Or fetch by product_id
      if (productIdOrApi.product_id) {
        const u = new URL('https://serpapi.com/search.json')
        u.search = new URLSearchParams({
          engine: 'google_product',
          product_id: productIdOrApi.product_id,
          gl,
          hl: 'en',
          api_key: this.apiKey
        }).toString()

        const j = await fetch(u).then(r => r.json())
        const seller = j?.sellers_results?.online_sellers?.[0]?.link
        return seller || j?.product_link || null
      }
    } catch (e) {
      console.warn('resolveGoogleProductLink failed', e)
    }
    return null
  }

  /**
   * Search Amazon directly via SerpAPI Amazon engine
   */
  private async searchAmazonViaSerp(query: string, region: string): Promise<RawProduct[]> {
    const amazonDomains: Record<string, string> = {
      'US': 'amazon.com',
      'UK': 'amazon.co.uk',
      'CA': 'amazon.ca',
      'AU': 'amazon.com.au',
      'IN': 'amazon.in',
      'EU': 'amazon.de'
    }

    const u = new URL('https://serpapi.com/search.json')
    u.search = new URLSearchParams({
      engine: 'amazon',
      amazon_domain: amazonDomains[region] || 'amazon.com',
      k: query,  // Amazon engine uses 'k' not 'q'
      api_key: this.apiKey
    }).toString()

    try {
      const j = await fetch(u).then(r => r.json())
      console.log('🔍 Amazon API response summary:', {
        total_results: j?.organic_results?.length || 0,
        search_metadata: j?.search_metadata?.status || 'unknown'
      })
      const rows = j?.organic_results ?? []

      return rows.map((r: any, idx: number) => {
        // Comprehensive Amazon price extraction with detailed logging
        let price: number | undefined = undefined

        console.log(`🔍 Amazon product ${idx + 1}: "${r.title}" - Price data:`, {
          extracted_price: r.extracted_price,
          price: r.price,
          extracted_old_price: r.extracted_old_price,
          old_price: r.old_price
        })

        // Amazon API price extraction - based on actual API response structure

        // Method 1: Direct extracted_price (most reliable for Amazon)
        if (typeof r.extracted_price === 'number' && r.extracted_price > 0) {
          price = r.extracted_price
          console.log(`✅ Amazon price found via extracted_price: $${price}`)
        }

        // Method 2: Price string parsing
        else if (r.price && typeof r.price === 'string') {
          const parsed = this.parsePrice(r.price)
          if (parsed) {
            price = parsed
            console.log(`✅ Amazon price found via price string parsing: $${price} from "${r.price}"`)
          }
        }

        // Method 3: Old price as fallback (extracted_old_price)
        else if (typeof r.extracted_old_price === 'number' && r.extracted_old_price > 0) {
          price = r.extracted_old_price
          console.log(`✅ Amazon price found via extracted_old_price (fallback): $${price}`)
        }

        // Method 4: Old price string as fallback
        else if (r.old_price && typeof r.old_price === 'string') {
          const parsed = this.parsePrice(r.old_price)
          if (parsed) {
            price = parsed
            console.log(`✅ Amazon price found via old_price string parsing (fallback): $${price} from "${r.old_price}"`)
          }
        }

        if (!price) {
          console.log(`❌ No Amazon price found for "${r.title}". All price fields:`, {
            extracted_price: r.extracted_price,
            price: r.price,
            price_upper: r.price_upper,
            price_range: r.price_range,
            available_keys: Object.keys(r).filter(k => k.toLowerCase().includes('price'))
          })
        }

        return {
          id: String(r.asin || r.product_id || `amz_${Date.now()}_${idx}`),
          title: r.title,
          url: r.link,
          image: r.thumbnail,
          merchant: 'Amazon',
          price,
          currency: r.price?.currency || 'USD',
          rating: Number(r.rating) || undefined,
          reviewCount: Number(r.reviews_count || r.reviews) || undefined,
          shipRegion: region,
          category: undefined
        }
      }).filter((p: RawProduct) => p.title && p.url)
    } catch (error) {
      console.warn('Amazon engine search failed:', error)
      return []
    }
  }

  /**
   * Parse products with URL resolution for missing URLs
   */
  private async parseProductsWithResolve(response: SerpAPIResponse, region: string, amazonOnly: boolean, gl: string): Promise<RawProduct[]> {
    const shoppingResults = response.shopping_results

    if (!shoppingResults || !Array.isArray(shoppingResults)) {
      console.warn('SerpAPI: shopping_results missing or not an array')
      return []
    }

    console.log(`SerpAPI: Processing ${shoppingResults.length} shopping results`)

    const currency = CURRENCY_MAPPING[region as keyof typeof CURRENCY_MAPPING] || 'USD'

    // First pass normalize
    let normalized = shoppingResults.map((item, index) => this.normalizeProduct(item, currency, region, index))

    // Queue items missing url but have product_id or serpapi_product_api
    const needsResolve = shoppingResults
      .map((item, i) => ({ item, i }))
      .filter(({ i }) => !normalized[i]?.url && ((shoppingResults[i] as any)?.product_id || (shoppingResults[i] as any)?.serpapi_product_api))
      .slice(0, 5) // protect quota

    for (const { item, i } of needsResolve) {
      const url = await this.resolveGoogleProductLink(
        { product_id: (item as any).product_id, serpapi_product_api: (item as any).serpapi_product_api },
        gl
      )
      if (url) {
        normalized[i] = { ...(normalized[i] || {} as any), url } as RawProduct
      }
    }

    // Final filter: require title+url
    let products = (normalized.filter(p => p?.title && p?.url) as RawProduct[])

    if (amazonOnly) {
      products = this.filterAmazonOnly(products)
    }

    return products
  }

  /**
   * Filter products to only Amazon ones
   */
  private filterAmazonOnly(products: RawProduct[]): RawProduct[] {
    const filtered = products.filter(product => {
      const url = product.url?.toLowerCase() || ''
      const merchant = product.merchant?.toLowerCase() || ''

      // Check if URL contains Amazon domain (comprehensive list)
      const isAmazonUrl = url.includes('amazon.com') ||
        url.includes('amazon.co.uk') ||
        url.includes('amazon.ca') ||
        url.includes('amazon.com.au') ||
        url.includes('amazon.in') ||
        url.includes('amazon.de') ||
        url.includes('amazon.co.jp') ||
        url.includes('amazon.cn') ||
        url.includes('amazon.com.br') ||
        url.includes('amazon.com.mx')

      // Check if merchant is Amazon (various formats)
      const isAmazonMerchant = merchant.includes('amazon') ||
        merchant === 'amazon'

      const isAmazon = isAmazonUrl || isAmazonMerchant

      if (isAmazon) {
        console.log(`✅ Amazon product found: ${product.title} from ${merchant}`)
      }

      return isAmazon
    })

    console.log(`SerpAPI: Filtered to ${filtered.length} Amazon-only products from ${products.length} total results`)

    if (filtered.length === 0) {
      console.warn('⚠️ No Amazon products found. This is common due to Amazon\'s restrictions on Google Shopping API.')
    }

    return filtered
  }


  /**
   * Parse price from string format - enhanced for Amazon formats
   */
  private parsePrice(priceStr?: string): number | undefined {
    if (!priceStr) return undefined

    const str = String(priceStr).trim()
    console.log(`🔍 Parsing price string: "${str}"`)

    // Handle various Amazon price formats
    const patterns = [
      // Standard formats: $19.99, £19.99, €19.99, ₹199
      /[\$£€₹¥]?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
      // Range formats: $19.99 - $29.99 (take first)
      /[\$£€₹¥]?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[\s\-]+to[\s\-]+[\$£€₹¥]?\d+/i,
      // From formats: from $19.99
      /from[\s]*[\$£€₹¥]?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      // Just numbers with optional decimals
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
    ]

    for (const pattern of patterns) {
      const match = str.match(pattern)
      if (match && match[1]) {
        const cleaned = match[1].replace(/,/g, '')
        const number = parseFloat(cleaned)

        if (Number.isFinite(number) && number > 0) {
          console.log(`✅ Parsed price: ${number} from "${str}"`)
          return number
        }
      }
    }

    console.log(`❌ Failed to parse price from: "${str}"`)
    return undefined
  }



  /**
   * Normalize a single product from SerpAPI format
   */
  private normalizeProduct(item: SerpAPIProduct, currency: string, region: string, index: number): RawProduct | null {
    try {
      // Build Product object with required and optional fields - ensure uniqueness
      const timestamp = Date.now()
      const id = (item as any).product_id ||
        (item as any).offer_id ||
        (item as any).serpapi_product_id ||
        `serp_${timestamp}_${index}_${item.position || Math.random().toString(36).substring(2, 11)}`

      const title = item.title?.trim()

      // More forgiving URL extraction - try multiple fields
      const url = (item as any).link ||
        (item as any).product_link ||
        (item as any).source_link ||
        (item as any).product?.link ||
        undefined

      // Skip if missing title (URL can be resolved later)
      if (!title) {
        console.debug('Skipping product - missing title')
        return null
      }

      // Parse price with better extraction and debugging
      let price = item.extracted_price
      if (typeof price === 'number' && price > 0) {
        console.log(`✅ Google Shopping price via extracted_price: $${price} for "${title}"`)
      } else if (item.price) {
        price = this.parsePrice(item.price)
        if (price) {
          console.log(`✅ Google Shopping price via parsePrice: $${price} for "${title}"`)
        } else {
          console.log(`❌ Google Shopping price parsing failed for "${title}". Raw price:`, item.price)
        }
      } else {
        console.log(`❌ No Google Shopping price found for "${title}". Available fields:`, {
          extracted_price: item.extracted_price,
          price: item.price,
          available_keys: Object.keys(item).filter(k => k.toLowerCase().includes('price'))
        })
      }

      const productCurrency = item.currency || currency
      const merchant = item.source || (item as any).seller || (item as any).store || 'Unknown'
      const rating = typeof item.rating === 'number' ? item.rating :
        (item.rating ? parseFloat(String(item.rating)) : undefined)
      const reviews = typeof item.reviews === 'number' ? item.reviews :
        (item.reviews ? parseInt(String(item.reviews)) : undefined)

      // More forgiving image extraction
      const image = item.thumbnail ||
        (item as any).image ||
        (item as any).thumbnail_link ||
        (item as any).images?.[0] ||
        undefined

      const shipRegion = region ? region.toUpperCase() : 'US'

      const product = {
        id: String(id),
        title,
        url,
        price,
        currency: productCurrency,
        merchant,
        rating,
        reviewCount: reviews,
        image,
        shipRegion,
        category: undefined
      }

      console.debug('Normalized product:', { title, price, merchant, rating, hasUrl: !!url })
      return product
    } catch (error) {
      console.warn('Failed to normalize product:', error, item)
      return null
    }
  }

}

// Factory function to create SerpAPI client
export function createSerpAPIClient(): SerpAPIClient {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    throw new ExternalAPIError('SERPAPI_KEY environment variable is not set', 'MISSING_API_KEY', false)
  }
  return new SerpAPIClient(apiKey)
}

// Convenience function for product search
export async function searchProducts(request: SearchRequest): Promise<SearchResponse> {
  const client = createSerpAPIClient()
  return client.searchProducts(request)
}
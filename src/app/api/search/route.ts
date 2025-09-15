import { NextRequest, NextResponse } from 'next/server'
import { getCachedData, setCachedData } from '@/lib/cache'
import { SearchResponse } from '@/types/api'
import { getCountryCodeFromCurrency, getRegionFromCurrency } from '@/lib/currency'

// Force Node.js runtime for external SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    const { query, category, budget, currency = "USD", amazonOnly = false, limit = 10 } = requestBody;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query is required', type: 'validation' },
        { status: 400 }
      );
    }

    if (!process.env.SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured', type: 'configuration' },
        { status: 500 }
      );
    }

    // Get region from currency
    const region = getRegionFromCurrency(currency as any);
    const countryCode = getCountryCodeFromCurrency(currency as any);

    // Generate cache key based on search parameters
    const cacheKey = generateSearchCacheKey(requestBody);
    
    // Try to get cached results first
    const cachedResults = await getCachedData<SearchResponse>(cacheKey);
    if (cachedResults) {
      console.log('Returning cached search results for:', query);
      return NextResponse.json(cachedResults);
    }

    // Build search query from the provided query and category
    let q = query;
    if (category) {
      q = `${category} ${query}`;
    }

    // For Amazon-only searches, we'll filter results after getting them
    // instead of using site: restriction which is too restrictive for Google Shopping

    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_shopping");
    u.searchParams.set("q", q);
    u.searchParams.set("gl", countryCode);
    u.searchParams.set("hl", "en");
    u.searchParams.set("num", String(Math.min(amazonOnly ? 20 : limit, 20))); // Get more results for Amazon filtering
    u.searchParams.set("api_key", process.env.SERPAPI_KEY!);
    
    // For Amazon-only searches, we'll rely on post-filtering
    // The merchant filter often returns no results due to Amazon's restrictions

    console.log('SerpAPI request:', u.toString());

    // Retry wrapper with 2 retries and 500-800ms backoff
    let data: any;
    let lastError: any;
    
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        if (attempt > 0) {
          const delay = 500 + Math.random() * 300; // 500-800ms
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const r = await fetch(u.toString(), {
          headers: {
            'User-Agent': 'GhostSetupFinder/1.0'
          }
        });
        
        data = await r.json();
        
        if (r.ok && !data.error && !data.error_message) {
          break; // Success
        }
        
        lastError = { status: r.status, data };
        if (attempt === 2) throw lastError;
        
      } catch (error) {
        lastError = error;
        if (attempt === 2) throw error;
      }
    }

    if (data.error || data.error_message) {
      console.error('SerpAPI error:', data);
      return NextResponse.json({ 
        products: [], 
        totalResults: 0,
        searchMetadata: {
          totalResults: 0,
          searchTime: Date.now(),
          currency: currency,
          query: q
        },
        error: data.error || data.error_message || "serpapi_error",
        type: 'external_api_error'
      }, { status: 502 });
    }

    const rows: any[] = Array.isArray(data.shopping_results) ? data.shopping_results : [];
    const hasShoppingResults = !!data.shopping_results;
    console.log(`SerpAPI response: { hasShoppingResults: ${hasShoppingResults}, resultsCount: ${rows.length} }`);
    
    const products = rows
      .map((it: any, i: number) => {
        const id = it.product_id || it.offer_id || it.serpapi_product_id || it.link || i.toString();
        const title = it.title?.trim();
        
        // More forgiving URL extraction
        const url = it.link ||
          it.product_link ||
          it.source_link ||
          it.product?.link ||
          undefined;
        
        // Only filter out items missing title OR url
        if (!title || !url) return null;
        
        const merchant = it.source || it.seller || it.store || 'Unknown';
        
        const price = it.extracted_price ?? parsePrice(it.price);
        
        // Filter by budget if specified
        if (budget && price && price > budget) {
          return null;
        }
        
        // If Amazon-only is requested, filter by merchant (strict filtering)
        if (amazonOnly) {
          const isAmazon = isAmazonProduct(merchant, url, title);
          if (!isAmazon) return null;
        }
        
        // More forgiving image extraction and validation
        const rawImage = it.thumbnail ||
          it.image ||
          it.thumbnail_link ||
          it.images?.[0] ||
          undefined;
        const image = validateImage(rawImage, title);
        
        return {
          id: String(id),
          title,
          url,
          image,
          price,
          currency: it.currency ?? guessCurrency(it.price, currency),
          merchant,
          rating: toNum(it.rating),
          reviewCount: toNum(it.reviews),
          shipRegion: region.toUpperCase(),
          category
        };
      })
      .filter((product): product is NonNullable<typeof product> => product !== null)
      .slice(0, limit); // Limit final results

    console.log(`SerpAPI parsed ${products.length} products`);

    // Special handling for Amazon-only searches with no results - try Amazon engine fallback
    if (amazonOnly && products.length === 0 && rows.length > 0) {
      console.warn(`Amazon-only search found no Amazon products from ${rows.length} total results - trying Amazon engine fallback`);
      
      try {
        const amazonProducts = await searchAmazonViaSerp(q, region, process.env.SERPAPI_KEY!);
        if (amazonProducts.length > 0) {
          console.log(`Amazon engine fallback found ${amazonProducts.length} products`);
          const searchResponse: SearchResponse = { 
            products: amazonProducts.slice(0, limit), 
            totalResults: amazonProducts.length,
            searchMetadata: {
              totalResults: amazonProducts.length,
              searchTime: Date.now(),
              currency: currency,
              query: q
            }
          };
          
          // Cache the results
          await setCachedData(cacheKey, searchResponse, 3600);
          return NextResponse.json(searchResponse);
        }
      } catch (error) {
        console.warn('Amazon engine fallback failed:', error);
      }
      
      return NextResponse.json({ 
        products: [], 
        totalResults: 0,
        searchMetadata: {
          totalResults: 0,
          searchTime: Date.now(),
          currency: currency,
          query: q
        },
        message: "No Amazon products found for this search. Try disabling 'Amazon only' to see more results.",
        type: 'amazon_filter_no_results'
      });
    }

    // If SerpAPI returns hasShoppingResults true but normalization produces 0
    if (hasShoppingResults && products.length === 0) {
      console.warn('Zero products normalized despite shopping results present. Raw keys:', Object.keys(data));
      return NextResponse.json({ 
        products: [], 
        totalResults: 0,
        searchMetadata: {
          totalResults: 0,
          searchTime: Date.now(),
          currency: currency,
          query: q
        }
      });
    }

    const searchResponse: SearchResponse = { 
      products, 
      totalResults: products.length,
      searchMetadata: {
        totalResults: products.length,
        searchTime: Date.now(), // Simple timestamp for now
        currency: currency,
        query: q
      }
    };

    // Cache the results for future requests (TTL: 1 hour)
    await setCachedData(cacheKey, searchResponse, 3600);
    console.log('Cached search results for:', query);

    return NextResponse.json(searchResponse);
  } catch (error: any) {
    console.error('Search API error:', error);
    const { currency = "USD", query = "" } = (error as any).requestBody || {};
    
    return NextResponse.json(
      { 
        products: [],
        totalResults: 0,
        searchMetadata: {
          totalResults: 0,
          searchTime: Date.now(),
          currency: currency,
          query: query
        },
        error: error.message || 'Search failed', 
        type: 'search_error'
      },
      { status: 502 }
    );
  }
}

function parsePrice(s?: string) {
  if (!s) return undefined;

  const str = String(s).trim();
  console.log(`🔍 Parsing price string: "${str}"`);

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
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const number = parseFloat(cleaned);
      
      if (Number.isFinite(number) && number > 0) {
        console.log(`✅ Parsed price: ${number} from "${str}"`);
        return number;
      }
    }
  }

  console.log(`❌ Failed to parse price from: "${str}"`);
  return undefined;
}

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function guessCurrency(s?: string, fallback: string = "USD") {
  if (!s) return fallback;
  if (s.includes("$")) return "USD";
  if (s.includes("₹")) return "INR";
  if (s.includes("€")) return "EUR";
  if (s.includes("£")) return "GBP";
  if (s.includes("C$")) return "CAD";
  if (s.includes("A$")) return "AUD";
  return fallback;
}

function validateImage(imageUrl?: string, title?: string): string | undefined {
  if (!imageUrl || !title) return imageUrl;
  
  // Basic image validation - reject common irrelevant patterns
  const irrelevantPatterns = [
    /no-image/i,
    /placeholder/i,
    /default/i,
    /missing/i,
    /unavailable/i,
    /generic/i,
    /stock-photo/i,
    /sample/i
  ];
  
  // Check if image URL contains irrelevant patterns
  for (const pattern of irrelevantPatterns) {
    if (pattern.test(imageUrl)) {
      return undefined; // Remove irrelevant images
    }
  }
  
  // Additional validation: check for very small images (likely icons/logos)
  const urlParams = new URLSearchParams(imageUrl.split('?')[1] || '');
  const width = parseInt(urlParams.get('w') || urlParams.get('width') || '0');
  const height = parseInt(urlParams.get('h') || urlParams.get('height') || '0');
  
  if ((width > 0 && width < 100) || (height > 0 && height < 100)) {
    return undefined; // Reject very small images
  }
  
  return imageUrl;
}

function generateSearchCacheKey(requestBody: any): string {
  // Create a consistent cache key based on search parameters
  const { query, category, budget, currency, amazonOnly, limit } = requestBody;
  const keyData = {
    query: query?.toLowerCase().trim(),
    category: category,
    budget: budget,
    currency: currency || 'USD',
    amazonOnly: amazonOnly || false,
    limit: limit || 10,
    timestamp: Math.floor(Date.now() / (1000 * 60 * 10)) // 10-minute cache buckets
  };
  
  // Create a more unique hash that includes all parameters
  const keyString = JSON.stringify(keyData, Object.keys(keyData).sort());
  return `search_v2_${keyString.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

async function searchAmazonViaSerp(query: string, region: string, apiKey: string): Promise<any[]> {
  const amazonDomains: Record<string, string> = {
    'US': 'amazon.com',
    'UK': 'amazon.co.uk',
    'CA': 'amazon.ca',
    'AU': 'amazon.com.au',
    'IN': 'amazon.in',
    'EU': 'amazon.de'
  };
  
  const u = new URL('https://serpapi.com/search.json');
  u.search = new URLSearchParams({
    engine: 'amazon',
    amazon_domain: amazonDomains[region] || 'amazon.com',
    k: query,  // Amazon engine uses 'k' not 'q'
    api_key: apiKey
  }).toString();

  try {
    const response = await fetch(u.toString());
    const j = await response.json();
    const rows = j?.organic_results ?? [];
    
    return rows.map((r: any, idx: number) => {
      // Comprehensive Amazon price extraction with detailed logging
      let price: number | undefined = undefined;
      
      console.log(`🔍 Amazon product ${idx + 1}: "${r.title}" - Raw price data:`, {
        extracted_price: r.extracted_price,
        price: r.price,
        price_type: typeof r.price,
        price_upper: r.price_upper,
        price_range: r.price_range,
        full_object: JSON.stringify(r, null, 2).substring(0, 500) + '...'
      });

      // Amazon API price extraction - based on actual API response structure
      
      // Method 1: Direct extracted_price (most reliable for Amazon)
      if (typeof r.extracted_price === 'number' && r.extracted_price > 0) {
        price = r.extracted_price;
        console.log(`✅ Amazon price found via extracted_price: $${price}`);
      }
      
      // Method 2: Price string parsing
      else if (r.price && typeof r.price === 'string') {
        const parsed = parsePrice(r.price);
        if (parsed) {
          price = parsed;
          console.log(`✅ Amazon price found via price string parsing: $${price} from "${r.price}"`);
        }
      }

      // Method 3: Old price as fallback (extracted_old_price)
      else if (typeof r.extracted_old_price === 'number' && r.extracted_old_price > 0) {
        price = r.extracted_old_price;
        console.log(`✅ Amazon price found via extracted_old_price (fallback): $${price}`);
      }

      // Method 4: Old price string as fallback
      else if (r.old_price && typeof r.old_price === 'string') {
        const parsed = parsePrice(r.old_price);
        if (parsed) {
          price = parsed;
          console.log(`✅ Amazon price found via old_price string parsing (fallback): $${price} from "${r.old_price}"`);
        }
      }
      
      if (!price) {
        console.log(`❌ No Amazon price found for "${r.title}". All price fields:`, {
          extracted_price: r.extracted_price,
          price: r.price,
          price_upper: r.price_upper,
          price_range: r.price_range,
          available_keys: Object.keys(r).filter(k => k.toLowerCase().includes('price'))
        });
      }

      return {
        id: String(r.asin || r.product_id || `amz_${Date.now()}_${idx}`),
        title: r.title,
        url: r.link,
        image: r.thumbnail,
        price,
        currency: r.price?.currency || 'USD',
        merchant: 'Amazon',
        rating: Number(r.rating) || undefined,
        reviewCount: Number(r.reviews_count || r.reviews) || undefined,
        shipRegion: region.toUpperCase(),
        category: undefined
      };
    }).filter((p: any) => p.title && p.url);
  } catch (error) {
    console.warn('Amazon engine search failed:', error);
    return [];
  }
}

function isAmazonProduct(merchant: string, url: string, title: string): boolean {
  const merchantLower = merchant.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // Comprehensive Amazon domain checking
  const amazonDomains = [
    'amazon.com',
    'amazon.co.uk', 
    'amazon.ca',
    'amazon.de',
    'amazon.fr',
    'amazon.it',
    'amazon.es',
    'amazon.in',
    'amazon.com.au',
    'amazon.co.jp',
    'amazon.cn',
    'amazon.com.br',
    'amazon.com.mx'
  ];
  
  // Check URL patterns (most reliable)
  for (const domain of amazonDomains) {
    if (urlLower.includes(domain)) {
      console.log(`✅ Amazon product found via URL: ${title} from ${domain}`);
      return true;
    }
  }
  
  // Check merchant name (secondary check - various formats)
  const amazonMerchantPatterns = [
    'amazon',
    'amazon.com',
    'amazon inc',
    'amazon llc',
    'amazon services',
    'amazon marketplace'
  ];
  
  for (const pattern of amazonMerchantPatterns) {
    if (merchantLower.includes(pattern)) {
      console.log(`✅ Amazon product found via merchant: ${title} from ${merchant}`);
      return true;
    }
  }
  
  // Debug: Log non-Amazon products when filtering
  console.log(`❌ Non-Amazon product: ${title} from ${merchant} (${url})`);
  return false;
}
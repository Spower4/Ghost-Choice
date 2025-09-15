// Currency conversion and formatting utilities

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'BRL' | 'MXN'

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  BRL: 'R$',
  MXN: '$'
}

// Currency names mapping
export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  INR: 'Indian Rupee',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  BRL: 'Brazilian Real',
  MXN: 'Mexican Peso'
}

// Approximate exchange rates (in production, these should come from a real API)
// Base currency: USD
export const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  INR: 83.0,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 150.0,
  CNY: 7.3,
  BRL: 5.0,
  MXN: 17.0
}

// Regional currency defaults
export const REGION_CURRENCY_MAP: Record<string, SupportedCurrency> = {
  US: 'USD',
  EU: 'EUR',
  UK: 'GBP',
  IN: 'INR',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  CN: 'CNY',
  BR: 'BRL',
  MX: 'MXN'
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / EXCHANGE_RATES[fromCurrency]
  const convertedAmount = usdAmount * EXCHANGE_RATES[toCurrency]
  
  return Math.round(convertedAmount * 100) / 100 // Round to 2 decimal places
}

/**
 * Format currency amount with proper symbol and locale
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  options: {
    showSymbol?: boolean
    showCode?: boolean
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string {
  const {
    showSymbol = true,
    showCode = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options

  // Format the number with proper decimal places
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount)

  // Build the formatted string
  let result = ''
  
  if (showSymbol) {
    result += CURRENCY_SYMBOLS[currency]
  }
  
  result += formattedNumber
  
  if (showCode) {
    result += ` ${currency}`
  }
  
  return result
}

/**
 * Format currency for display in product cards
 */
export function formatProductPrice(
  amount: number,
  currency: SupportedCurrency
): string {
  return formatCurrency(amount, currency, {
    showSymbol: true,
    showCode: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/**
 * Format currency for budget displays
 */
export function formatBudgetAmount(
  amount: number,
  currency: SupportedCurrency
): string {
  // For large amounts, show in K format
  if (amount >= 1000) {
    const kAmount = amount / 1000
    return `${CURRENCY_SYMBOLS[currency]}${kAmount.toFixed(kAmount >= 10 ? 0 : 1)}K`
  }
  
  return formatCurrency(amount, currency, {
    showSymbol: true,
    showCode: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

/**
 * Parse currency string back to number
 */
export function parseCurrencyString(
  currencyString: string,
  currency: SupportedCurrency
): number {
  // Remove currency symbol and any non-numeric characters except decimal point
  const symbol = CURRENCY_SYMBOLS[currency]
  let cleanString = currencyString.replace(symbol, '').trim()
  
  // Handle K suffix
  const hasKSuffix = cleanString.toLowerCase().endsWith('k')
  if (hasKSuffix) {
    cleanString = cleanString.slice(0, -1)
  }
  
  // Remove commas and parse
  const numericString = cleanString.replace(/,/g, '')
  const amount = parseFloat(numericString)
  
  if (isNaN(amount)) {
    throw new Error(`Invalid currency string: ${currencyString}`)
  }
  
  return hasKSuffix ? amount * 1000 : amount
}

/**
 * Get default currency for a region
 */
export function getRegionCurrency(region: string): SupportedCurrency {
  return REGION_CURRENCY_MAP[region] || 'USD'
}

/**
 * Get region from currency
 */
export function getRegionFromCurrency(currency: SupportedCurrency): string {
  const currencyToRegionMap: Record<SupportedCurrency, string> = {
    USD: 'US',
    EUR: 'EU', 
    GBP: 'UK',
    INR: 'IN',
    CAD: 'CA',
    AUD: 'AU',
    JPY: 'JP',
    CNY: 'CN',
    BRL: 'BR',
    MXN: 'MX'
  }
  return currencyToRegionMap[currency] || 'US'
}

/**
 * Get Google Shopping country code from currency
 */
export function getCountryCodeFromCurrency(currency: SupportedCurrency): string {
  const currencyToCountryMap: Record<SupportedCurrency, string> = {
    USD: 'us',
    EUR: 'de', // Use Germany for EU
    GBP: 'gb',
    INR: 'in',
    CAD: 'ca',
    AUD: 'au',
    JPY: 'jp',
    CNY: 'cn',
    BRL: 'br',
    MXN: 'mx'
  }
  return currencyToCountryMap[currency] || 'us'
}

/**
 * Validate if a currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return Object.keys(CURRENCY_SYMBOLS).includes(currency)
}

/**
 * Get all supported currencies with their details
 */
export function getSupportedCurrencies(): Array<{
  code: SupportedCurrency
  name: string
  symbol: string
}> {
  return Object.keys(CURRENCY_SYMBOLS).map(code => ({
    code: code as SupportedCurrency,
    name: CURRENCY_NAMES[code as SupportedCurrency],
    symbol: CURRENCY_SYMBOLS[code as SupportedCurrency]
  }))
}

/**
 * Calculate total cost in a specific currency
 */
export function calculateTotalCost(
  items: Array<{ price: number; currency: string }>,
  targetCurrency: SupportedCurrency
): number {
  return items.reduce((total, item) => {
    if (!isSupportedCurrency(item.currency)) {
      throw new Error(`Unsupported currency: ${item.currency}`)
    }
    
    const convertedPrice = convertCurrency(
      item.price,
      item.currency as SupportedCurrency,
      targetCurrency
    )
    
    return total + convertedPrice
  }, 0)
}

/**
 * Format price range
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency: SupportedCurrency
): string {
  if (minPrice === maxPrice) {
    return formatProductPrice(minPrice, currency)
  }
  
  return `${formatProductPrice(minPrice, currency)} - ${formatProductPrice(maxPrice, currency)}`
}

/**
 * Check if amount is within budget
 */
export function isWithinBudget(
  amount: number,
  amountCurrency: SupportedCurrency,
  budget: number,
  budgetCurrency: SupportedCurrency,
  tolerance: number = 0.05 // 5% tolerance
): boolean {
  const convertedAmount = convertCurrency(amount, amountCurrency, budgetCurrency)
  const maxAllowed = budget * (1 + tolerance)
  
  return convertedAmount <= maxAllowed
}

/**
 * Calculate budget distribution percentages
 */
export function calculateBudgetPercentages(
  distributions: Array<{ category: string; amount: number }>,
  totalBudget: number
): Array<{ category: string; amount: number; percentage: number }> {
  return distributions.map(dist => ({
    ...dist,
    percentage: Math.round((dist.amount / totalBudget) * 100 * 100) / 100 // Round to 2 decimal places
  }))
}
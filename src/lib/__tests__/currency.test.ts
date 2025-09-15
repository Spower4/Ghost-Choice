import { describe, it, expect } from 'vitest'
import {
  convertCurrency,
  formatCurrency,
  formatProductPrice,
  formatBudgetAmount,
  parseCurrencyString,
  getRegionCurrency,
  isSupportedCurrency,
  calculateTotalCost,
  formatPriceRange,
  isWithinBudget,
  calculateBudgetPercentages,
  CURRENCY_SYMBOLS,
  CURRENCY_NAMES
} from '../currency'

describe('Currency Utilities', () => {
  describe('convertCurrency', () => {
    it('should return same amount for same currency', () => {
      expect(convertCurrency(100, 'USD', 'USD')).toBe(100)
    })

    it('should convert USD to EUR correctly', () => {
      const result = convertCurrency(100, 'USD', 'EUR')
      expect(result).toBe(85) // Based on exchange rate 0.85
    })

    it('should convert EUR to USD correctly', () => {
      const result = convertCurrency(85, 'EUR', 'USD')
      expect(result).toBe(100) // Should be approximately 100
    })

    it('should handle INR conversion', () => {
      const result = convertCurrency(83, 'INR', 'USD')
      expect(result).toBe(1) // 83 INR = 1 USD
    })
  })

  describe('formatCurrency', () => {
    it('should format USD with symbol', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100')
    })

    it('should format EUR with symbol', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100')
    })

    it('should format with currency code when requested', () => {
      expect(formatCurrency(100, 'USD', { showCode: true })).toBe('$100 USD')
    })

    it('should format without symbol when requested', () => {
      expect(formatCurrency(100, 'USD', { showSymbol: false })).toBe('100')
    })

    it('should handle decimal places', () => {
      expect(formatCurrency(99.99, 'USD', { maximumFractionDigits: 2 })).toBe('$99.99')
    })

    it('should format large numbers with commas', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
    })
  })

  describe('formatProductPrice', () => {
    it('should format product price correctly', () => {
      expect(formatProductPrice(299.99, 'USD')).toBe('$299.99')
    })

    it('should handle whole numbers', () => {
      expect(formatProductPrice(300, 'USD')).toBe('$300')
    })
  })

  describe('formatBudgetAmount', () => {
    it('should format small amounts normally', () => {
      expect(formatBudgetAmount(500, 'USD')).toBe('$500')
    })

    it('should format large amounts with K suffix', () => {
      expect(formatBudgetAmount(1500, 'USD')).toBe('$1.5K')
    })

    it('should format very large amounts with K suffix', () => {
      expect(formatBudgetAmount(15000, 'USD')).toBe('$15K')
    })
  })

  describe('parseCurrencyString', () => {
    it('should parse simple currency string', () => {
      expect(parseCurrencyString('$100', 'USD')).toBe(100)
    })

    it('should parse currency string with commas', () => {
      expect(parseCurrencyString('$1,234', 'USD')).toBe(1234)
    })

    it('should parse currency string with K suffix', () => {
      expect(parseCurrencyString('$1.5K', 'USD')).toBe(1500)
    })

    it('should throw on invalid currency string', () => {
      expect(() => parseCurrencyString('invalid', 'USD')).toThrow()
    })
  })

  describe('getRegionCurrency', () => {
    it('should return USD for US region', () => {
      expect(getRegionCurrency('US')).toBe('USD')
    })

    it('should return EUR for EU region', () => {
      expect(getRegionCurrency('EU')).toBe('EUR')
    })

    it('should return USD for unknown region', () => {
      expect(getRegionCurrency('UNKNOWN')).toBe('USD')
    })
  })

  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('USD')).toBe(true)
      expect(isSupportedCurrency('EUR')).toBe(true)
      expect(isSupportedCurrency('GBP')).toBe(true)
    })

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('JPY')).toBe(false)
      expect(isSupportedCurrency('INVALID')).toBe(false)
    })
  })

  describe('calculateTotalCost', () => {
    it('should calculate total cost in same currency', () => {
      const items = [
        { price: 100, currency: 'USD' },
        { price: 200, currency: 'USD' }
      ]
      expect(calculateTotalCost(items, 'USD')).toBe(300)
    })

    it('should calculate total cost with currency conversion', () => {
      const items = [
        { price: 100, currency: 'USD' },
        { price: 85, currency: 'EUR' } // 85 EUR = 100 USD
      ]
      expect(calculateTotalCost(items, 'USD')).toBe(200)
    })

    it('should throw on unsupported currency', () => {
      const items = [{ price: 100, currency: 'JPY' }]
      expect(() => calculateTotalCost(items, 'USD')).toThrow()
    })
  })

  describe('formatPriceRange', () => {
    it('should format single price when min equals max', () => {
      expect(formatPriceRange(100, 100, 'USD')).toBe('$100')
    })

    it('should format price range when different', () => {
      expect(formatPriceRange(100, 200, 'USD')).toBe('$100 - $200')
    })
  })

  describe('isWithinBudget', () => {
    it('should return true when within budget', () => {
      expect(isWithinBudget(90, 'USD', 100, 'USD')).toBe(true)
    })

    it('should return false when over budget', () => {
      expect(isWithinBudget(110, 'USD', 100, 'USD')).toBe(false)
    })

    it('should handle tolerance', () => {
      expect(isWithinBudget(103, 'USD', 100, 'USD', 0.05)).toBe(true) // 3% over with 5% tolerance
      expect(isWithinBudget(107, 'USD', 100, 'USD', 0.05)).toBe(false) // 7% over with 5% tolerance
    })

    it('should handle currency conversion', () => {
      expect(isWithinBudget(85, 'EUR', 100, 'USD')).toBe(true) // 85 EUR = 100 USD
    })
  })

  describe('calculateBudgetPercentages', () => {
    it('should calculate percentages correctly', () => {
      const distributions = [
        { category: 'Chair', amount: 300 },
        { category: 'Desk', amount: 700 }
      ]
      const result = calculateBudgetPercentages(distributions, 1000)
      
      expect(result).toEqual([
        { category: 'Chair', amount: 300, percentage: 30 },
        { category: 'Desk', amount: 700, percentage: 70 }
      ])
    })

    it('should handle decimal percentages', () => {
      const distributions = [
        { category: 'Chair', amount: 333 },
        { category: 'Desk', amount: 667 }
      ]
      const result = calculateBudgetPercentages(distributions, 1000)
      
      expect(result[0].percentage).toBe(33.3)
      expect(result[1].percentage).toBe(66.7)
    })
  })

  describe('Currency Constants', () => {
    it('should have symbols for all supported currencies', () => {
      expect(CURRENCY_SYMBOLS.USD).toBe('$')
      expect(CURRENCY_SYMBOLS.EUR).toBe('€')
      expect(CURRENCY_SYMBOLS.GBP).toBe('£')
      expect(CURRENCY_SYMBOLS.INR).toBe('₹')
      expect(CURRENCY_SYMBOLS.CAD).toBe('C$')
      expect(CURRENCY_SYMBOLS.AUD).toBe('A$')
    })

    it('should have names for all supported currencies', () => {
      expect(CURRENCY_NAMES.USD).toBe('US Dollar')
      expect(CURRENCY_NAMES.EUR).toBe('Euro')
      expect(CURRENCY_NAMES.GBP).toBe('British Pound')
    })
  })
})
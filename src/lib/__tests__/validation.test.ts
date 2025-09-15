import { describe, it, expect } from 'vitest'
import {
  SearchSettingsSchema,
  ProductSchema,
  SetupSchema,
  BuildRequestSchema,
  BuildResponseSchema,
  validateSearchSettings,
  validateProduct,
  validateSetup,
  validateBuildRequest,
  validateBuildResponse
} from '../validation'

describe('Validation Schemas', () => {
  describe('SearchSettingsSchema', () => {
    it('should validate correct search settings', () => {
      const validSettings = {
        style: 'Premium' as const,
        budget: 1000,
        currency: 'USD' as const,
        resultsMode: 'Multiple' as const,
        region: 'US' as const,
        amazonOnly: false
      }

      expect(() => SearchSettingsSchema.parse(validSettings)).not.toThrow()
    })

    it('should reject invalid style', () => {
      const invalidSettings = {
        style: 'Invalid',
        budget: 1000,
        currency: 'USD',
        resultsMode: 'Multiple',
        region: 'US',
        amazonOnly: false
      }

      expect(() => SearchSettingsSchema.parse(invalidSettings)).toThrow()
    })

    it('should reject negative budget', () => {
      const invalidSettings = {
        style: 'Premium',
        budget: -100,
        currency: 'USD',
        resultsMode: 'Multiple',
        region: 'US',
        amazonOnly: false
      }

      expect(() => SearchSettingsSchema.parse(invalidSettings)).toThrow()
    })

    it('should reject budget over maximum', () => {
      const invalidSettings = {
        style: 'Premium',
        budget: 2000000,
        currency: 'USD',
        resultsMode: 'Multiple',
        region: 'US',
        amazonOnly: false
      }

      expect(() => SearchSettingsSchema.parse(invalidSettings)).toThrow()
    })
  })

  describe('ProductSchema', () => {
    it('should validate correct product', () => {
      const validProduct = {
        id: 'prod-123',
        title: 'Gaming Chair',
        price: 299.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1250,
        imageUrl: 'https://example.com/image.jpg',
        productUrl: 'https://example.com/product',
        rationale: 'Great ergonomic design with lumbar support',
        category: 'Furniture',
        features: ['Ergonomic', 'Adjustable height'],
        pros: ['Comfortable', 'Durable'],
        cons: ['Expensive'],
        confidence: 0.95,
        searchRank: 1
      }

      expect(() => ProductSchema.parse(validProduct)).not.toThrow()
    })

    it('should reject invalid URL', () => {
      const invalidProduct = {
        id: 'prod-123',
        title: 'Gaming Chair',
        price: 299.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 4.5,
        reviewCount: 1250,
        imageUrl: 'not-a-url',
        productUrl: 'https://example.com/product',
        rationale: 'Great chair',
        features: [],
        pros: [],
        cons: [],
        confidence: 0.95,
        searchRank: 1
      }

      expect(() => ProductSchema.parse(invalidProduct)).toThrow()
    })

    it('should reject rating outside valid range', () => {
      const invalidProduct = {
        id: 'prod-123',
        title: 'Gaming Chair',
        price: 299.99,
        currency: 'USD',
        merchant: 'Amazon',
        rating: 6.0, // Invalid: > 5
        reviewCount: 1250,
        imageUrl: 'https://example.com/image.jpg',
        productUrl: 'https://example.com/product',
        rationale: 'Great chair',
        features: [],
        pros: [],
        cons: [],
        confidence: 0.95,
        searchRank: 1
      }

      expect(() => ProductSchema.parse(invalidProduct)).toThrow()
    })
  })

  describe('SetupSchema', () => {
    it('should validate correct setup', () => {
      const validSetup = {
        id: 'setup-123',
        query: 'gaming setup',
        products: [],
        budgetDistribution: [],
        totalCost: 1500,
        settings: {
          style: 'Premium' as const,
          budget: 2000,
          currency: 'USD' as const,
          resultsMode: 'Multiple' as const,
          region: 'US' as const,
          amazonOnly: false
        },
        createdAt: new Date(),
        shareId: 'abc123'
      }

      expect(() => SetupSchema.parse(validSetup)).not.toThrow()
    })

    it('should reject empty query', () => {
      const invalidSetup = {
        id: 'setup-123',
        query: '', // Invalid: empty
        products: [],
        budgetDistribution: [],
        totalCost: 1500,
        settings: {
          style: 'Premium',
          budget: 2000,
          currency: 'USD',
          resultsMode: 'Multiple',
          region: 'US',
          amazonOnly: false
        },
        createdAt: new Date()
      }

      expect(() => SetupSchema.parse(invalidSetup)).toThrow()
    })
  })

  describe('BuildRequestSchema', () => {
    it('should validate correct build request', () => {
      const validRequest = {
        query: 'office setup',
        settings: {
          style: 'Casual' as const,
          budget: 800,
          currency: 'USD' as const,
          resultsMode: 'Multiple' as const,
          region: 'US' as const,
          amazonOnly: true
        }
      }

      expect(() => BuildRequestSchema.parse(validRequest)).not.toThrow()
    })

    it('should reject query that is too long', () => {
      const invalidRequest = {
        query: 'a'.repeat(201), // Invalid: > 200 chars
        settings: {
          style: 'Casual',
          budget: 800,
          currency: 'USD',
          resultsMode: 'Multiple',
          region: 'US',
          amazonOnly: true
        }
      }

      expect(() => BuildRequestSchema.parse(invalidRequest)).toThrow()
    })
  })

  describe('Validation Helper Functions', () => {
    it('should validate search settings using helper', () => {
      const validSettings = {
        style: 'Premium' as const,
        budget: 1000,
        currency: 'USD' as const,
        resultsMode: 'Single' as const,
        region: 'EU' as const,
        amazonOnly: false
      }

      expect(() => validateSearchSettings(validSettings)).not.toThrow()
    })

    it('should throw on invalid search settings using helper', () => {
      const invalidSettings = {
        style: 'Invalid',
        budget: 1000,
        currency: 'USD',
        resultsMode: 'Single',
        region: 'EU',
        amazonOnly: false
      }

      expect(() => validateSearchSettings(invalidSettings)).toThrow()
    })
  })
})
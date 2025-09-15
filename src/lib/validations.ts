import { z } from 'zod'

// Search Settings Schema
export const searchSettingsSchema = z.object({
  style: z.enum(['Premium', 'Casual']),
  budget: z.number().min(1).max(100000),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']),
  resultsMode: z.enum(['Single', 'Multiple']),
  region: z.enum(['US', 'IN', 'UK', 'EU', 'CA', 'AU']),
  amazonOnly: z.boolean(),
})

// Product Schema
export const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().min(0),
  currency: z.string(),
  merchant: z.string(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().min(0),
  imageUrl: z.string().url(),
  productUrl: z.string().url(),
  rationale: z.string(),
  category: z.string().optional(),
  features: z.array(z.string()),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  searchRank: z.number().min(1),
})

// API Request Schemas
export const buildRequestSchema = z.object({
  query: z.string().min(1).max(200),
  settings: searchSettingsSchema,
})

export const searchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  category: z.string().optional(),
  budget: z.number().min(1).optional(),
  region: z.string(),
  amazonOnly: z.boolean(),
  limit: z.number().min(1).max(50),
})

export const sceneRequestSchema = z.object({
  products: z.array(productSchema),
  style: z.enum(['Cozy', 'Minimal', 'Gaming', 'Modern']),
  roomType: z.string().optional(),
})

export const shareRequestSchema = z.object({
  setup: z.object({
    query: z.string(),
    products: z.array(productSchema),
    budgetDistribution: z.array(z.object({
      category: z.string(),
      amount: z.number(),
      percentage: z.number(),
      color: z.string(),
    })).optional(),
    totalCost: z.number(),
    settings: searchSettingsSchema,
  }),
})

// Environment Variables Schema
export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  SERPAPI_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})
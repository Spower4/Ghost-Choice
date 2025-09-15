import { z } from 'zod'

// Core validation schemas
export const SearchSettingsSchema = z.object({
  style: z.enum(['Premium', 'Casual']),
  budget: z.number().positive().max(1000000),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY', 'BRL', 'MXN']),
  amazonOnly: z.boolean()
})

export const ProductSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  price: z.number().positive(),
  currency: z.string().length(3),
  merchant: z.string().min(1).max(100),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().min(0),
  imageUrl: z.string().min(1),
  productUrl: z.string().min(1),
  rationale: z.string().max(1000),
  category: z.string().optional(),
  features: z.array(z.string()).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  searchRank: z.number().min(1)
})

export const BudgetDistributionSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  percentage: z.number().min(0).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i)
})

export const SetupSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(1).max(200),
  products: z.array(ProductSchema),
  budgetDistribution: z.array(BudgetDistributionSchema),
  totalCost: z.number().positive(),
  settings: SearchSettingsSchema,
  createdAt: z.date(),
  shareId: z.string().optional()
})

// API Request/Response Schemas
export const PlanRequestSchema = z.object({
  query: z.string().min(1).max(200),
  budget: z.number().positive().max(1000000),
  style: z.enum(['Premium', 'Casual']),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY', 'BRL', 'MXN'])
})

export const CategoryPlanSchema = z.object({
  category: z.string().min(1),
  priority: z.number().min(1).max(10),
  budgetAllocation: z.number().positive(),
  searchTerms: z.array(z.string()),
  requirements: z.array(z.string())
})

export const SearchStrategySchema = z.object({
  approach: z.enum(['setup', 'single']),
  categories: z.array(z.string()),
  totalItems: z.number().positive()
})

export const PlanResponseSchema = z.object({
  categories: z.array(CategoryPlanSchema),
  budgetDistribution: z.array(BudgetDistributionSchema),
  searchStrategy: SearchStrategySchema
})

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  category: z.string().optional(),
  budget: z.number().positive().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY', 'BRL', 'MXN']),
  amazonOnly: z.boolean(),
  limit: z.number().min(1).max(50).default(10)
})

export const RawProductSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
  price: z.number().positive().optional(),
  currency: z.string().optional(),
  merchant: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().min(0).optional(),
  image: z.string().optional(),
  shipRegion: z.string().optional(),
  category: z.string().optional()
})

export const SearchMetadataSchema = z.object({
  totalResults: z.number().min(0),
  searchTime: z.number().positive(),
  currency: z.string(),
  query: z.string()
})

export const SearchResponseSchema = z.object({
  products: z.array(RawProductSchema),
  totalResults: z.number().min(0),
  searchMetadata: SearchMetadataSchema
})

export const RankingCriteriaSchema = z.object({
  priceWeight: z.number().min(0).max(1),
  ratingWeight: z.number().min(0).max(1),
  reviewWeight: z.number().min(0).max(1),
  relevanceWeight: z.number().min(0).max(1)
})

export const UserPreferencesSchema = z.object({
  style: z.enum(['Premium', 'Casual']),
  budget: z.number().positive(),
  prioritizeRating: z.boolean()
})

export const RankRequestSchema = z.object({
  products: z.array(RawProductSchema),
  criteria: RankingCriteriaSchema,
  userPreferences: UserPreferencesSchema
})

export const RankResponseSchema = z.object({
  rankedProducts: z.array(ProductSchema),
  reasoning: z.array(z.string())
})

export const BuildRequestSchema = z.object({
  query: z.string().min(1).max(200),
  settings: SearchSettingsSchema
})

export const BuildResponseSchema = z.object({
  products: z.array(ProductSchema),
  budgetChart: z.array(BudgetDistributionSchema).optional(),
  ghostTips: z.array(z.string()),
  searchMetadata: SearchMetadataSchema,
  isSetup: z.boolean()
})

export const SceneRequestSchema = z.object({
  products: z.array(ProductSchema),
  style: z.enum(['Cozy', 'Minimal', 'Gaming', 'Modern']),
  roomType: z.string().optional()
})

export const SceneResponseSchema = z.object({
  imageUrl: z.string().min(1),
  prompt: z.string(),
  style: z.string()
})

export const ShareRequestSchema = z.object({
  setup: z.object({
    query: z.string().min(1),
    products: z.array(ProductSchema),
    budgetDistribution: z.array(BudgetDistributionSchema).optional(),
    totalCost: z.number().positive(),
    settings: SearchSettingsSchema
  })
})

export const ShareResponseSchema = z.object({
  shareId: z.string().min(1),
  shortUrl: z.string().min(1),
  expiresAt: z.date()
})

// Error validation schema
export const APIErrorSchema = z.object({
  type: z.enum(['VALIDATION_ERROR', 'EXTERNAL_API_ERROR', 'RATE_LIMIT_ERROR', 'NETWORK_ERROR', 'INTERNAL_ERROR']),
  message: z.string().min(1),
  code: z.string().min(1),
  details: z.unknown().optional(),
  retryable: z.boolean()
})

// Validation helper functions
export function validateSearchSettings(data: unknown) {
  return SearchSettingsSchema.parse(data)
}

export function validateProduct(data: unknown) {
  return ProductSchema.parse(data)
}

export function validateSetup(data: unknown) {
  return SetupSchema.parse(data)
}

export function validateBuildRequest(data: unknown) {
  return BuildRequestSchema.parse(data)
}

export function validateBuildResponse(data: unknown) {
  return BuildResponseSchema.parse(data)
}

// Type inference from schemas
export type ValidatedSearchSettings = z.infer<typeof SearchSettingsSchema>
export type ValidatedProduct = z.infer<typeof ProductSchema>
export type ValidatedSetup = z.infer<typeof SetupSchema>
export type ValidatedBuildRequest = z.infer<typeof BuildRequestSchema>
export type ValidatedBuildResponse = z.infer<typeof BuildResponseSchema>
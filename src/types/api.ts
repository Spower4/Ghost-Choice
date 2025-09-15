// API-specific type definitions

import { Product, SearchSettings, BudgetDistribution } from './index'

// Extract currency type from SearchSettings for consistency
type Currency = SearchSettings['currency']

// Planning API Types
export interface PlanRequest {
  query: string
  budget: number
  style: 'Premium' | 'Casual'
  currency: Currency
}

export interface CategoryPlan {
  category: string
  priority: number
  budgetAllocation: number
  searchTerms: string[]
  requirements: string[]
}

export interface SearchStrategy {
  approach: 'setup'
  categories: string[]
  totalItems: number
}

export interface PlanResponse {
  categories: CategoryPlan[]
  budgetDistribution: BudgetDistribution[]
  searchStrategy: SearchStrategy
}

// Search API Types
export interface SearchRequest {
  query: string
  category?: string
  budget?: number
  currency: Currency
  amazonOnly: boolean
  limit: number
}

export interface RawProduct {
  id: string
  title: string
  url: string
  price?: number
  currency?: string
  merchant?: string
  rating?: number
  reviewCount?: number
  image?: string
  shipRegion?: string
  category?: string
}

export interface SearchMetadata {
  totalResults: number
  searchTime: number
  currency: string
  query: string
}

export interface SearchResponse {
  products: RawProduct[]
  totalResults: number
  searchMetadata: SearchMetadata
}

// Ranking API Types
export interface RankingCriteria {
  priceWeight: number
  ratingWeight: number
  reviewWeight: number
  relevanceWeight: number
}

export interface UserPreferences {
  style: 'Premium' | 'Casual'
  budget: number
  prioritizeRating: boolean
}

export interface RankRequest {
  products: RawProduct[]
  criteria: RankingCriteria
  userPreferences: UserPreferences
}

export interface RankResponse {
  rankedProducts: Product[]
  reasoning: string[]
}

// Build API Types (Main Orchestrator)
export interface BuildRequest {
  query: string
  settings: SearchSettings
}

export interface BuildResponse {
  products: Product[]
  budgetChart?: BudgetDistribution[]
  ghostTips: string[]
  searchMetadata: SearchMetadata
  isSetup: boolean
  searchId?: string // ID for cached search results
}

// AI Scene Generation Types
export interface SceneRequest {
  products: Product[]
  style: 'Cozy' | 'Minimal' | 'Gaming' | 'Modern'
  roomType?: string
}

export interface SceneResponse {
  imageUrl: string
  prompt: string
  style: string
}

// Share API Types
export interface ShareRequest {
  setup: {
    query: string
    products: Product[]
    budgetDistribution?: BudgetDistribution[]
    totalCost: number
    settings: SearchSettings
  }
}

export interface ShareResponse {
  shareId: string
  shortUrl: string
  expiresAt: Date
}

// Swap API Types
export interface SwapRequest {
  productId: string
  category?: string
  productTitle?: string
  budget: number
  settings: {
    style: 'Premium' | 'Casual'
    currency: Currency
    region: string
    amazonOnly: boolean
  }
  excludeIds?: string[]
}

export interface SwapResponse {
  alternatives: Product[]
  fromCache: boolean
}

// Reroll API Types
export interface RerollRequest {
  originalQuery: string
  settings: SearchSettings
  excludeIds?: string[]
}

export interface RerollResponse {
  products: Product[]
  budgetChart?: BudgetDistribution[]
  ghostTips: string[]
  searchMetadata: SearchMetadata
  isSetup: boolean
}
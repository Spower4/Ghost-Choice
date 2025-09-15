// Core type definitions for Ghost Setup Finder

export interface SearchSettings {
  style: 'Premium' | 'Casual'
  budget: number
  currency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'BRL' | 'MXN'
  amazonOnly: boolean
  setupType?: 'premium' | 'casual'
  minBudget?: number
  maxBudget?: number
  region?: string
}

export interface Product {
  id: string
  title: string
  price: number
  currency: string
  merchant: string
  rating: number
  reviewCount: number
  imageUrl: string
  productUrl: string
  rationale: string
  category?: string
  features: string[]
  pros: string[]
  cons: string[]
  confidence: number
  searchRank: number
}

export interface BudgetDistribution {
  category: string
  amount: number
  percentage: number
  color: string
}

export interface Setup {
  id: string
  query: string
  products: Product[]
  budgetDistribution: BudgetDistribution[]
  totalCost: number
  settings: SearchSettings
  createdAt: Date
  shareId?: string
}

export interface CategoryStats {
  category: string
  count: number
  totalCost: number
  averageRating: number
}

export interface AIScene {
  id: string
  setupId: string
  style: 'Cozy' | 'Minimal' | 'Gaming' | 'Modern'
  imageUrl: string
  prompt: string
  products: string[]
  generatedAt: Date
}

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface APIError {
  type: ErrorType
  message: string
  code: string
  details?: unknown
  retryable: boolean
}
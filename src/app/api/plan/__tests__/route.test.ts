import { NextRequest } from 'next/server'
import { POST } from '../route'
import { generatePlan } from '@/lib/api/gemini'
import { getCachedData, setCachedData } from '@/lib/cache'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/api/gemini')
vi.mock('@/lib/cache')

const mockGeneratePlan = vi.mocked(generatePlan)
const mockGetCachedData = vi.mocked(getCachedData)
const mockSetCachedData = vi.mocked(setCachedData)

describe('/api/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedData.mockResolvedValue(null)
    mockSetCachedData.mockResolvedValue(undefined)
  })

  const validPlanRequest = {
    query: 'office setup',
    budget: 1000,
    style: 'Premium' as const,
    region: 'US' as const
  }

  const mockPlanResponse = {
    categories: [
      {
        category: 'Desk',
        priority: 1,
        budgetAllocation: 400,
        searchTerms: ['office desk', 'standing desk'],
        requirements: ['Ergonomic', 'Sturdy']
      },
      {
        category: 'Chair',
        priority: 2,
        budgetAllocation: 300,
        searchTerms: ['office chair', 'ergonomic chair'],
        requirements: ['Lumbar support', 'Adjustable']
      }
    ],
    budgetDistribution: [
      {
        category: 'Desk',
        amount: 400,
        percentage: 40,
        color: '#FF6B6B'
      },
      {
        category: 'Chair',
        amount: 300,
        percentage: 30,
        color: '#4ECDC4'
      }
    ],
    searchStrategy: {
      approach: 'setup' as const,
      categories: ['Desk', 'Chair'],
      totalItems: 2
    }
  }

  it('should generate a plan successfully', async () => {
    mockGeneratePlan.mockResolvedValue(mockPlanResponse)

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(validPlanRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockPlanResponse)
    expect(mockGeneratePlan).toHaveBeenCalledWith(validPlanRequest)
    expect(mockSetCachedData).toHaveBeenCalled()
  })

  it('should return cached plan if available', async () => {
    mockGetCachedData.mockResolvedValue(mockPlanResponse)

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(validPlanRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockPlanResponse)
    expect(mockGeneratePlan).not.toHaveBeenCalled()
    expect(mockGetCachedData).toHaveBeenCalled()
  })

  it('should validate request data', async () => {
    const invalidRequest = {
      query: '', // Invalid: empty query
      budget: -100, // Invalid: negative budget
      style: 'Invalid',
      region: 'XX'
    }

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(invalidRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.type).toBe('VALIDATION_ERROR')
    expect(mockGeneratePlan).not.toHaveBeenCalled()
  })

  it('should handle missing request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(mockGeneratePlan).not.toHaveBeenCalled()
  })

  it('should handle Gemini API errors', async () => {
    mockGeneratePlan.mockRejectedValue(new Error('Gemini API error'))

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(validPlanRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
    expect(mockGeneratePlan).toHaveBeenCalledWith(validPlanRequest)
  })

  it('should handle budget distribution correctly', async () => {
    const planWithBudgetDistribution = {
      ...mockPlanResponse,
      budgetDistribution: [
        {
          category: 'Desk',
          amount: 600,
          percentage: 60,
          color: '#FF6B6B'
        },
        {
          category: 'Chair',
          amount: 400,
          percentage: 40,
          color: '#4ECDC4'
        }
      ]
    }

    mockGeneratePlan.mockResolvedValue(planWithBudgetDistribution)

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(validPlanRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.budgetDistribution).toHaveLength(2)
    expect(data.budgetDistribution[0].amount + data.budgetDistribution[1].amount).toBe(1000)
  })

  it('should handle single item queries', async () => {
    const singleItemRequest = {
      query: 'gaming chair',
      budget: 500,
      style: 'Casual' as const,
      region: 'US' as const
    }

    const singleItemResponse = {
      categories: [
        {
          category: 'Gaming Chair',
          priority: 1,
          budgetAllocation: 500,
          searchTerms: ['gaming chair', 'ergonomic gaming chair'],
          requirements: ['Comfortable', 'Durable']
        }
      ],
      budgetDistribution: [
        {
          category: 'Gaming Chair',
          amount: 500,
          percentage: 100,
          color: '#FF6B6B'
        }
      ],
      searchStrategy: {
        approach: 'single' as const,
        categories: ['Gaming Chair'],
        totalItems: 1
      }
    }

    mockGeneratePlan.mockResolvedValue(singleItemResponse)

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(singleItemRequest)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.searchStrategy.approach).toBe('single')
    expect(data.categories).toHaveLength(1)
  })

  it('should handle different regions', async () => {
    const ukRequest = {
      ...validPlanRequest,
      region: 'UK' as const
    }

    mockGeneratePlan.mockResolvedValue(mockPlanResponse)

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(ukRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockGeneratePlan).toHaveBeenCalledWith(ukRequest)
  })

  it('should handle different styles', async () => {
    const casualRequest = {
      ...validPlanRequest,
      style: 'Casual' as const
    }

    mockGeneratePlan.mockResolvedValue(mockPlanResponse)

    const request = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify(casualRequest)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockGeneratePlan).toHaveBeenCalledWith(casualRequest)
  })
})
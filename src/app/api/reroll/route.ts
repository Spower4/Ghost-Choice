import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleAPIError } from '@/lib/errors'
import { RerollRequest, RerollResponse } from '@/types/api'

// Force Node.js runtime for external SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RerollRequestSchema = z.object({
  originalQuery: z.string().min(1),
  settings: z.object({
    style: z.enum(['Premium', 'Casual']),
    budget: z.number().positive(),
    currency: z.string(),
    resultsMode: z.enum(['Single', 'Multiple']),
    region: z.string(),
    amazonOnly: z.boolean()
  }),
  excludeIds: z.array(z.string()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { originalQuery, settings, excludeIds = [] } = RerollRequestSchema.parse(body)

    // For reroll, we essentially call the build API again with the same parameters
    // but we can exclude previously shown products if needed
    const buildResponse = await fetch(`${request.nextUrl.origin}/api/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: originalQuery,
        settings
      }),
    })

    if (!buildResponse.ok) {
      const error = await buildResponse.json()
      throw new Error(error.message || 'Failed to reroll setup')
    }

    const buildData = await buildResponse.json()

    // Filter out excluded products if any
    let filteredProducts = buildData.products
    if (excludeIds.length > 0) {
      filteredProducts = buildData.products.filter(
        (product: any) => !excludeIds.includes(product.id)
      )
    }

    const response: RerollResponse = {
      products: filteredProducts,
      budgetChart: buildData.budgetChart,
      ghostTips: [
        ...buildData.ghostTips,
        "Fresh setup generated! 👻",
        "New products, same great style!",
        "Rerolled with your preferences in mind!"
      ],
      searchMetadata: {
        ...buildData.searchMetadata,
        query: `${originalQuery} (rerolled)`
      },
      isSetup: buildData.isSetup
    }

    return NextResponse.json(response)

  } catch (error) {
    return handleAPIError(error)
  }
}
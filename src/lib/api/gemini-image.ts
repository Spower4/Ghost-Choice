import { GoogleGenerativeAI } from '@google/generative-ai'
import { SceneRequest, SceneResponse } from '@/types/api'
import { Product } from '@/types'
import { ExternalAPIError, RateLimitError, withRetry, handleFetchError } from '@/lib/errors'

// Scene style configurations
const SCENE_STYLES = {
  Cozy: {
    description: 'warm, comfortable, inviting atmosphere with soft lighting and natural textures',
    colors: 'warm earth tones, soft browns, creams, and gentle oranges',
    lighting: 'soft, warm lighting with table lamps and natural light',
    materials: 'wood, fabric, natural materials, plants'
  },
  Minimal: {
    description: 'clean, simple, uncluttered space with focus on functionality',
    colors: 'neutral whites, grays, and blacks with minimal accent colors',
    lighting: 'bright, even lighting with clean lines',
    materials: 'metal, glass, smooth surfaces, geometric shapes'
  },
  Gaming: {
    description: 'high-tech, energetic setup optimized for gaming performance',
    colors: 'dark backgrounds with RGB lighting, neon accents, blues and purples',
    lighting: 'LED strips, RGB lighting, dramatic backlighting',
    materials: 'modern plastics, metal, glass, high-tech finishes'
  },
  Modern: {
    description: 'contemporary, sophisticated space with premium finishes',
    colors: 'sophisticated grays, whites, with bold accent colors',
    lighting: 'architectural lighting, pendant lights, clean modern fixtures',
    materials: 'premium materials, marble, steel, leather, glass'
  }
} as const

type SceneStyle = keyof typeof SCENE_STYLES

// Gemini Image API client for scene generation
export class GeminiImageClient {
  private readonly client: GoogleGenerativeAI
  private readonly model: any

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new ExternalAPIError('Gemini API key is required', 'MISSING_API_KEY', false)
    }
    
    this.client = new GoogleGenerativeAI(apiKey)
    // Use Gemini 2.0 Flash for image generation
    this.model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  }

  /**
   * Generate AI scene with products
   */
  async generateScene(request: SceneRequest): Promise<SceneResponse> {
    try {
      const prompt = this.buildScenePrompt(request)
      const result = await withRetry(() => this.generateImage(prompt))
      
      return {
        imageUrl: result.imageUrl,
        prompt: prompt,
        style: request.style
      }
    } catch (error) {
      if (error instanceof ExternalAPIError || error instanceof RateLimitError) {
        throw error
      }
      throw handleFetchError(error, 'Gemini Image API scene generation')
    }
  }

  /**
   * Generate multiple scene variations
   */
  async generateSceneVariations(request: SceneRequest, count: number = 3): Promise<SceneResponse[]> {
    const variations: SceneResponse[] = []
    const basePrompt = this.buildScenePrompt(request)
    
    for (let i = 0; i < count; i++) {
      try {
        // Add variation to the prompt
        const variationPrompt = this.addVariationToPrompt(basePrompt, i + 1)
        const result = await withRetry(() => this.generateImage(variationPrompt))
        
        variations.push({
          imageUrl: result.imageUrl,
          prompt: variationPrompt,
          style: request.style
        })
        
        // Add delay between requests to avoid rate limiting
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.warn(`Failed to generate scene variation ${i + 1}:`, error)
        // Continue with other variations even if one fails
      }
    }
    
    if (variations.length === 0) {
      throw new ExternalAPIError('Failed to generate any scene variations', 'SCENE_GENERATION_FAILED', true)
    }
    
    return variations
  }

  /**
   * Build scene generation prompt
   */
  private buildScenePrompt(request: SceneRequest): string {
    const { products, style, roomType } = request
    const styleConfig = SCENE_STYLES[style as SceneStyle]
    
    // Extract product information
    const productDescriptions = products.slice(0, 5).map(product => {
      const category = product.category || this.inferCategoryFromTitle(product.title)
      return `${category}: ${product.title}`
    }).join(', ')

    // Determine room type if not specified
    const inferredRoomType = roomType || this.inferRoomType(products)
    
    const prompt = `Create a photorealistic ${style.toLowerCase()} style ${inferredRoomType} scene featuring these products: ${productDescriptions}.

Style Guidelines:
- ${styleConfig.description}
- Color palette: ${styleConfig.colors}
- Lighting: ${styleConfig.lighting}
- Materials: ${styleConfig.materials}

Scene Requirements:
- Show the products naturally arranged in the space
- Maintain realistic proportions and placement
- Include appropriate background elements and decor
- Ensure good lighting that showcases the products
- Create depth and visual interest
- Make it look like a real, lived-in space

Technical Requirements:
- High resolution, photorealistic quality
- Professional interior design photography style
- Proper perspective and composition
- Natural shadows and reflections
- Consistent lighting throughout the scene

The scene should look like it could be featured in a premium interior design magazine, showcasing how these products work together in a real ${style.toLowerCase()} ${inferredRoomType}.`

    return prompt
  }

  /**
   * Add variation to prompt for multiple renders
   */
  private addVariationToPrompt(basePrompt: string, variationNumber: number): string {
    const variations = [
      'Shot from a different angle with emphasis on natural lighting',
      'Alternative camera perspective focusing on the overall room layout',
      'Close-up composition highlighting the key products and their details'
    ]
    
    const variation = variations[(variationNumber - 1) % variations.length]
    return `${basePrompt}\n\nVariation ${variationNumber}: ${variation}`
  }

  /**
   * Generate image using Gemini API
   */
  private async generateImage(prompt: string): Promise<{ imageUrl: string }> {
    try {
      // Note: This is a placeholder implementation
      // The actual Gemini Image API integration would depend on the specific API endpoints
      // For now, we'll simulate the response structure
      
      const result = await this.model.generateContent([
        {
          text: `Generate an image based on this description: ${prompt}`
        }
      ])
      
      const response = await result.response
      
      // In a real implementation, this would extract the image URL from the response
      // For now, we'll return a placeholder
      const imageUrl = this.generatePlaceholderImageUrl(prompt)
      
      return { imageUrl }
    } catch (error: any) {
      if (error.status === 429) {
        throw new RateLimitError('Gemini Image API rate limit exceeded', 'GEMINI_IMAGE_RATE_LIMIT', { error })
      }
      
      if (error.status >= 500) {
        throw new ExternalAPIError(
          `Gemini Image API server error: ${error.message}`,
          `GEMINI_IMAGE_${error.status}`,
          true,
          { error }
        )
      }
      
      throw new ExternalAPIError(
        `Gemini Image API error: ${error.message}`,
        'GEMINI_IMAGE_ERROR',
        false,
        { error }
      )
    }
  }

  /**
   * Generate placeholder image URL (for development/testing)
   */
  private generatePlaceholderImageUrl(prompt: string): string {
    // Create a hash of the prompt for consistent placeholder images
    const hash = this.simpleHash(prompt)
    const width = 800
    const height = 600
    
    // Use a placeholder service that can generate scene-like images
    return `https://picsum.photos/seed/${hash}/${width}/${height}`
  }

  /**
   * Simple hash function for consistent placeholder generation
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Infer product category from title
   */
  private inferCategoryFromTitle(title: string): string {
    const titleLower = title.toLowerCase()
    
    // Common product categories
    if (titleLower.includes('chair') || titleLower.includes('seat')) return 'Chair'
    if (titleLower.includes('desk') || titleLower.includes('table')) return 'Desk'
    if (titleLower.includes('monitor') || titleLower.includes('screen') || titleLower.includes('display')) return 'Monitor'
    if (titleLower.includes('keyboard')) return 'Keyboard'
    if (titleLower.includes('mouse')) return 'Mouse'
    if (titleLower.includes('lamp') || titleLower.includes('light')) return 'Lighting'
    if (titleLower.includes('speaker') || titleLower.includes('audio')) return 'Audio'
    if (titleLower.includes('headphone') || titleLower.includes('headset')) return 'Headphones'
    if (titleLower.includes('webcam') || titleLower.includes('camera')) return 'Camera'
    if (titleLower.includes('microphone') || titleLower.includes('mic')) return 'Microphone'
    if (titleLower.includes('stand') || titleLower.includes('mount')) return 'Stand'
    if (titleLower.includes('pad') || titleLower.includes('mat')) return 'Accessory'
    if (titleLower.includes('storage') || titleLower.includes('organizer')) return 'Storage'
    if (titleLower.includes('plant') || titleLower.includes('decor')) return 'Decor'
    
    return 'Product'
  }

  /**
   * Infer room type from products
   */
  private inferRoomType(products: Product[]): string {
    const titles = products.map(p => p.title.toLowerCase()).join(' ')
    
    // Analyze product types to determine room (check more specific first)
    if (titles.includes('gaming') || titles.includes('game') || titles.includes('rgb')) {
      return 'gaming room'
    }
    if (titles.includes('office') || titles.includes('desk') || titles.includes('chair')) {
      return 'office'
    }
    if (titles.includes('bedroom') || titles.includes('bed') || titles.includes('nightstand')) {
      return 'bedroom'
    }
    if (titles.includes('kitchen') || titles.includes('dining')) {
      return 'kitchen'
    }
    if (titles.includes('living') || titles.includes('sofa') || titles.includes('couch')) {
      return 'living room'
    }
    
    return 'room'
  }

  /**
   * Validate scene request
   */
  validateSceneRequest(request: SceneRequest): void {
    if (!request.products || request.products.length === 0) {
      throw new ExternalAPIError('At least one product is required for scene generation', 'INVALID_SCENE_REQUEST', false)
    }
    
    if (request.products.length > 10) {
      throw new ExternalAPIError('Too many products for scene generation (max 10)', 'TOO_MANY_PRODUCTS', false)
    }
    
    if (!Object.keys(SCENE_STYLES).includes(request.style)) {
      throw new ExternalAPIError(`Invalid scene style: ${request.style}`, 'INVALID_SCENE_STYLE', false)
    }
  }

  /**
   * Get available scene styles
   */
  getAvailableStyles(): Array<{ style: string; description: string }> {
    return Object.entries(SCENE_STYLES).map(([style, config]) => ({
      style,
      description: config.description
    }))
  }

  /**
   * Estimate scene generation time
   */
  estimateGenerationTime(productCount: number, variationCount: number = 1): number {
    // Base time per scene + additional time per product + variation overhead
    const baseTime = 30 // seconds
    const timePerProduct = 5 // seconds
    const timePerVariation = 20 // seconds
    
    return baseTime + (productCount * timePerProduct) + ((variationCount - 1) * timePerVariation)
  }
}

// Factory function to create Gemini Image client
export function createGeminiImageClient(): GeminiImageClient {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ExternalAPIError('GEMINI_API_KEY environment variable is not set', 'MISSING_API_KEY', false)
  }
  return new GeminiImageClient(apiKey)
}

// Convenience functions
export async function generateScene(request: SceneRequest): Promise<SceneResponse> {
  const client = createGeminiImageClient()
  client.validateSceneRequest(request)
  return client.generateScene(request)
}

export async function generateSceneVariations(request: SceneRequest, count: number = 3): Promise<SceneResponse[]> {
  const client = createGeminiImageClient()
  client.validateSceneRequest(request)
  return client.generateSceneVariations(request, count)
}

export function getAvailableSceneStyles(): Array<{ style: string; description: string }> {
  const client = createGeminiImageClient()
  return client.getAvailableStyles()
}

// Export scene styles for use in components
export { SCENE_STYLES }
export type { SceneStyle }
// Application configuration constants

export const APP_CONFIG = {
  name: 'Ghost Setup Finder',
  description: 'AI-powered product discovery with a friendly ghost guide',
  version: '1.0.0',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  rateLimit: {
    requests: 100,
    window: 60000, // 1 minute
  },
} as const

export const GHOST_TIPS = [
  "Chairs with lumbar support are trending today 👻",
  "Pro tip: Check reviews for durability insights 👻",
  "Budget-friendly doesn't mean low quality 👻",
  "Consider your space dimensions before buying 👻",
  "Ergonomic accessories can boost productivity 👻",
  "Look for warranty coverage on electronics 👻",
  "Seasonal sales can save you 20-40% 👻",
  "Read the fine print on return policies 👻",
] as const

export const STYLE_COLORS = {
  Premium: '#8B5CF6', // Purple
  Casual: '#10B981',  // Green
} as const

export const CATEGORY_COLORS = [
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#84CC16', // Lime
] as const
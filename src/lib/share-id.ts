/**
 * Generate a short, URL-safe share ID
 */
export function generateShareId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Validate share ID format
 */
export function isValidShareId(shareId: string): boolean {
  // Share IDs should be 6-12 characters, alphanumeric only
  const shareIdRegex = /^[A-Za-z0-9]{6,12}$/
  return shareIdRegex.test(shareId)
}

/**
 * Generate unique share ID with collision checking
 */
export async function generateUniqueShareId(
  checkExists: (id: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shareId = generateShareId()
    const exists = await checkExists(shareId)
    
    if (!exists) {
      return shareId
    }
  }
  
  // If we can't generate a unique ID after max attempts, use a longer one
  return generateShareId(12)
}
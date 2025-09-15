import { describe, it, expect } from 'vitest'
import { checkRedisHealth } from '../cache'

describe('Redis Integration', () => {
  it('should handle Redis connection gracefully', async () => {
    // This test verifies that Redis health check handles both success and failure cases
    const isHealthy = await checkRedisHealth()
    
    // The function should always return a boolean
    expect(typeof isHealthy).toBe('boolean')
    
    // In test environment without proper env vars, we expect false
    // In production with proper env vars, we expect true
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      expect(isHealthy).toBe(true)
    } else {
      expect(isHealthy).toBe(false)
      // Redis connection test skipped - environment variables not configured for testing
    }
  }, 10000) // 10 second timeout for network operations
})
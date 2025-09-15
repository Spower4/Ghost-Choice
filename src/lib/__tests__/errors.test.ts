import { describe, it, expect, vi } from 'vitest'
import {
  ValidationError,
  ExternalAPIError,
  RateLimitError,
  NetworkError,
  InternalError,
  createAPIError,
  handleZodError,
  handleFetchError,
  isRetryableError,
  getErrorMessage,
  getErrorCode,
  getUserFriendlyMessage,
  withRetry,
  DEFAULT_RETRY_CONFIG
} from '../errors'
import { ErrorType } from '@/types'

describe('Error Utilities', () => {
  describe('Error Classes', () => {
    describe('ValidationError', () => {
      it('should create validation error correctly', () => {
        const error = new ValidationError('Invalid input', 'INVALID_FORMAT')
        
        expect(error.type).toBe(ErrorType.VALIDATION_ERROR)
        expect(error.message).toBe('Invalid input')
        expect(error.code).toBe('INVALID_FORMAT')
        expect(error.retryable).toBe(false)
      })

      it('should convert to API error', () => {
        const error = new ValidationError('Invalid input')
        const apiError = error.toAPIError()
        
        expect(apiError.type).toBe(ErrorType.VALIDATION_ERROR)
        expect(apiError.message).toBe('Invalid input')
        expect(apiError.retryable).toBe(false)
      })
    })

    describe('ExternalAPIError', () => {
      it('should create external API error correctly', () => {
        const error = new ExternalAPIError('API failed', 'API_DOWN', true)
        
        expect(error.type).toBe(ErrorType.EXTERNAL_API_ERROR)
        expect(error.message).toBe('API failed')
        expect(error.code).toBe('API_DOWN')
        expect(error.retryable).toBe(true)
      })

      it('should default to retryable', () => {
        const error = new ExternalAPIError('API failed')
        expect(error.retryable).toBe(true)
      })
    })

    describe('RateLimitError', () => {
      it('should create rate limit error correctly', () => {
        const error = new RateLimitError('Too many requests')
        
        expect(error.type).toBe(ErrorType.RATE_LIMIT_ERROR)
        expect(error.retryable).toBe(true)
      })
    })

    describe('NetworkError', () => {
      it('should create network error correctly', () => {
        const error = new NetworkError('Connection failed')
        
        expect(error.type).toBe(ErrorType.NETWORK_ERROR)
        expect(error.retryable).toBe(true)
      })
    })

    describe('InternalError', () => {
      it('should create internal error correctly', () => {
        const error = new InternalError('Server error')
        
        expect(error.type).toBe(ErrorType.INTERNAL_ERROR)
        expect(error.retryable).toBe(false)
      })
    })
  })

  describe('Error Utilities', () => {
    describe('createAPIError', () => {
      it('should create API error object', () => {
        const error = createAPIError(
          ErrorType.VALIDATION_ERROR,
          'Invalid data',
          'INVALID',
          false,
          { field: 'email' }
        )
        
        expect(error.type).toBe(ErrorType.VALIDATION_ERROR)
        expect(error.message).toBe('Invalid data')
        expect(error.code).toBe('INVALID')
        expect(error.retryable).toBe(false)
        expect(error.details).toEqual({ field: 'email' })
      })
    })

    describe('handleZodError', () => {
      it('should handle Zod validation error', () => {
        const zodError = {
          issues: [
            { path: ['email'], message: 'Invalid email format' },
            { path: ['age'], message: 'Must be a number' }
          ]
        }
        
        const error = handleZodError(zodError)
        
        expect(error).toBeInstanceOf(ValidationError)
        expect(error.message).toContain('email: Invalid email format')
        expect(error.message).toContain('age: Must be a number')
        expect(error.code).toBe('ZOD_VALIDATION_ERROR')
      })

      it('should handle Zod error without issues', () => {
        const zodError = {}
        const error = handleZodError(zodError)
        
        expect(error.message).toBe('Validation failed')
      })
    })

    describe('handleFetchError', () => {
      it('should handle network fetch error', () => {
        const fetchError = new TypeError('Failed to fetch')
        const error = handleFetchError(fetchError, 'API call')
        
        expect(error).toBeInstanceOf(NetworkError)
        expect(error.message).toContain('Network error in API call')
      })

      it('should handle HTTP error with status', () => {
        const httpError = { status: 500, message: 'Internal Server Error' }
        const error = handleFetchError(httpError, 'API call')
        
        expect(error).toBeInstanceOf(ExternalAPIError)
        expect(error.code).toBe('HTTP_500')
        expect(error.retryable).toBe(true) // 500 is retryable
      })

      it('should handle 4xx errors as non-retryable', () => {
        const httpError = { status: 404, message: 'Not Found' }
        const error = handleFetchError(httpError, 'API call')
        
        expect(error.retryable).toBe(false) // 404 is not retryable
      })

      it('should handle 429 as retryable', () => {
        const httpError = { status: 429, message: 'Too Many Requests' }
        const error = handleFetchError(httpError, 'API call')
        
        expect(error.retryable).toBe(true) // 429 is retryable
      })
    })

    describe('isRetryableError', () => {
      it('should identify retryable errors', () => {
        expect(isRetryableError(new NetworkError('Connection failed'))).toBe(true)
        expect(isRetryableError(new RateLimitError('Too many requests'))).toBe(true)
        expect(isRetryableError(new ExternalAPIError('API down', 'API_DOWN', true))).toBe(true)
      })

      it('should identify non-retryable errors', () => {
        expect(isRetryableError(new ValidationError('Invalid input'))).toBe(false)
        expect(isRetryableError(new InternalError('Server error'))).toBe(false)
        expect(isRetryableError(new ExternalAPIError('Bad request', 'BAD_REQUEST', false))).toBe(false)
      })
    })

    describe('getErrorMessage', () => {
      it('should get message from error', () => {
        const error = new ValidationError('Invalid input')
        expect(getErrorMessage(error)).toBe('Invalid input')
      })

      it('should handle standard Error', () => {
        const error = new Error('Standard error')
        expect(getErrorMessage(error)).toBe('Standard error')
      })
    })

    describe('getErrorCode', () => {
      it('should get code from custom error', () => {
        const error = new ValidationError('Invalid input', 'INVALID_FORMAT')
        expect(getErrorCode(error)).toBe('INVALID_FORMAT')
      })

      it('should return default code for standard Error', () => {
        const error = new Error('Standard error')
        expect(getErrorCode(error)).toBe('UNKNOWN_ERROR')
      })
    })

    describe('getUserFriendlyMessage', () => {
      it('should return friendly message for validation error', () => {
        const error = createAPIError(ErrorType.VALIDATION_ERROR, 'Invalid input', 'INVALID')
        expect(getUserFriendlyMessage(error)).toBe('Please check your input and try again.')
      })

      it('should return friendly message for 404 error', () => {
        const error = createAPIError(ErrorType.EXTERNAL_API_ERROR, 'Not found', 'HTTP_404')
        expect(getUserFriendlyMessage(error)).toBe('No products found for your search. Try adjusting your filters or search terms.')
      })

      it('should return friendly message for rate limit error', () => {
        const error = createAPIError(ErrorType.RATE_LIMIT_ERROR, 'Too many requests', 'RATE_LIMIT')
        expect(getUserFriendlyMessage(error)).toBe("We're getting lots of requests! Please wait a moment and try again.")
      })

      it('should return friendly message for network error', () => {
        const error = createAPIError(ErrorType.NETWORK_ERROR, 'Connection failed', 'NETWORK')
        expect(getUserFriendlyMessage(error)).toBe('Having trouble connecting. Please check your internet and try again.')
      })
    })
  })

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await withRetry(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Connection failed'))
        .mockResolvedValue('success')
      
      const result = await withRetry(operation, { ...DEFAULT_RETRY_CONFIG, initialDelay: 10 })
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable error', async () => {
      const operation = vi.fn().mockRejectedValue(new ValidationError('Invalid input'))
      
      await expect(withRetry(operation)).rejects.toThrow('Invalid input')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should respect max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new NetworkError('Connection failed'))
      
      await expect(withRetry(operation, { ...DEFAULT_RETRY_CONFIG, maxRetries: 2, initialDelay: 10 }))
        .rejects.toThrow('Connection failed')
      expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should add extra delay for RateLimitError', async () => {
      const startTime = Date.now()
      let attempts = 0
      
      const operation = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts <= 1) {
          const error = new RateLimitError('Rate limit exceeded', 'RATE_LIMIT')
          throw error
        }
        return 'success'
      })

      const result = await withRetry(operation, { maxRetries: 1, initialDelay: 100 })
      const elapsed = Date.now() - startTime
      
      expect(result).toBe('success')
      expect(attempts).toBe(2)
      // Should have extra 1000ms delay for rate limit + base delay + jitter
      expect(elapsed).toBeGreaterThan(1000)
    })

    it('should use exponential backoff with jitter', async () => {
      let attempts = 0
      
      const operation = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts <= 2) {
          throw new ExternalAPIError('Server error', 'SERVER_ERROR', true)
        }
        return 'success'
      })

      const startTime = Date.now()
      await withRetry(operation, { maxRetries: 2, initialDelay: 100 })
      const elapsed = Date.now() - startTime
      
      expect(attempts).toBe(3)
      // Should have delays: 100ms + jitter, then 200ms + jitter
      expect(elapsed).toBeGreaterThan(300) // At least base delays
      expect(elapsed).toBeLessThan(1000) // But not too much with jitter
    })
  })
})
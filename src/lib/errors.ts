import { ErrorType, APIError } from '@/types'

// Custom error classes
export class ValidationError extends Error {
  public readonly type = ErrorType.VALIDATION_ERROR
  public readonly retryable = false
  public readonly code: string
  public readonly details?: unknown

  constructor(message: string, code: string = 'VALIDATION_FAILED', details?: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.code = code
    this.details = details
  }

  toAPIError(): APIError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      retryable: this.retryable
    }
  }
}

export class ExternalAPIError extends Error {
  public readonly type = ErrorType.EXTERNAL_API_ERROR
  public readonly retryable: boolean
  public readonly code: string
  public readonly details?: unknown

  constructor(message: string, code: string = 'EXTERNAL_API_FAILED', retryable: boolean = true, details?: unknown) {
    super(message)
    this.name = 'ExternalAPIError'
    this.code = code
    this.retryable = retryable
    this.details = details
  }

  toAPIError(): APIError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      retryable: this.retryable
    }
  }
}

export class RateLimitError extends Error {
  public readonly type = ErrorType.RATE_LIMIT_ERROR
  public readonly retryable = true
  public readonly code: string
  public readonly details?: unknown

  constructor(message: string, code: string = 'RATE_LIMIT_EXCEEDED', details?: unknown) {
    super(message)
    this.name = 'RateLimitError'
    this.code = code
    this.details = details
  }

  toAPIError(): APIError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      retryable: this.retryable
    }
  }
}

export class NetworkError extends Error {
  public readonly type = ErrorType.NETWORK_ERROR
  public readonly retryable = true
  public readonly code: string
  public readonly details?: unknown

  constructor(message: string, code: string = 'NETWORK_FAILED', details?: unknown) {
    super(message)
    this.name = 'NetworkError'
    this.code = code
    this.details = details
  }

  toAPIError(): APIError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      retryable: this.retryable
    }
  }
}

export class InternalError extends Error {
  public readonly type = ErrorType.INTERNAL_ERROR
  public readonly retryable = false
  public readonly code: string
  public readonly details?: unknown

  constructor(message: string, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message)
    this.name = 'InternalError'
    this.code = code
    this.details = details
  }

  toAPIError(): APIError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      retryable: this.retryable
    }
  }
}

// Error handling utilities
export function createAPIError(
  type: ErrorType,
  message: string,
  code: string,
  retryable: boolean = false,
  details?: unknown
): APIError {
  return {
    type,
    message,
    code,
    details,
    retryable
  }
}

export function handleZodError(error: any): ValidationError {
  const issues = error.issues || []
  const messages = issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`)
  const message = messages.length > 0 ? messages.join(', ') : 'Validation failed'
  
  return new ValidationError(message, 'ZOD_VALIDATION_ERROR', { issues })
}

export function handleFetchError(error: any, context: string): ExternalAPIError | NetworkError {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError(`Network error in ${context}: ${error.message}`, 'FETCH_FAILED', { originalError: error })
  }
  
  if (error.status) {
    const retryable = error.status >= 500 || error.status === 429
    return new ExternalAPIError(
      `API error in ${context}: ${error.message || 'Unknown error'}`,
      `HTTP_${error.status}`,
      retryable,
      { status: error.status, originalError: error }
    )
  }
  
  return new ExternalAPIError(`Unknown error in ${context}: ${error.message}`, 'UNKNOWN_ERROR', false, { originalError: error })
}

export function isRetryableError(error: Error | APIError): boolean {
  if ('retryable' in error) {
    return error.retryable
  }
  
  // Default retry logic for standard errors
  if (error instanceof NetworkError || error instanceof RateLimitError) {
    return true
  }
  
  if (error instanceof ExternalAPIError) {
    return error.retryable
  }
  
  return false
}

export function getErrorMessage(error: Error | APIError): string {
  if ('message' in error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}

export function getErrorCode(error: Error | APIError): string {
  if ('code' in error) {
    return error.code
  }
  
  return 'UNKNOWN_ERROR'
}

// User-friendly error messages
export function getUserFriendlyMessage(error: APIError): string {
  switch (error.type) {
    case ErrorType.VALIDATION_ERROR:
      return 'Please check your input and try again.'
    
    case ErrorType.EXTERNAL_API_ERROR:
      if (error.code.includes('404')) {
        return 'No products found for your search. Try adjusting your filters or search terms.'
      }
      if (error.code.includes('401') || error.code.includes('403')) {
        return 'Authentication error. Please try again later.'
      }
      return 'Having trouble connecting to our services. Please try again in a moment.'
    
    case ErrorType.RATE_LIMIT_ERROR:
      return "We're getting lots of requests! Please wait a moment and try again."
    
    case ErrorType.NETWORK_ERROR:
      return 'Having trouble connecting. Please check your internet and try again.'
    
    case ErrorType.INTERNAL_ERROR:
      return 'Something went wrong on our end. Please try again later.'
    
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number
  backoffMultiplier: number
  initialDelay: number
  maxDelay: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 10000
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries = 2, backoffMultiplier = 2, initialDelay = 800, maxDelay = 10000 } = config
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries || !isRetryableError(lastError)) {
        throw lastError
      }
      
      // Exponential backoff with jitter
      const baseDelay = initialDelay * Math.pow(backoffMultiplier, attempt)
      const jitter = Math.floor(Math.random() * 250)
      const rateLimitExtra = lastError.name === 'RateLimitError' ? 1000 : 0
      
      const delay = Math.min(baseDelay + jitter + rateLimitExtra, maxDelay)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// API error handler for Next.js routes
export function handleAPIError(error: unknown): Response {
  // Handle known error types
  if (error instanceof ValidationError || 
      error instanceof ExternalAPIError || 
      error instanceof RateLimitError || 
      error instanceof NetworkError || 
      error instanceof InternalError) {
    const apiError = error.toAPIError()
    const status = getStatusFromErrorType(apiError.type)
    
    return new Response(JSON.stringify({
      error: true,
      type: apiError.type,
      message: getUserFriendlyMessage(apiError),
      code: apiError.code,
      retryable: apiError.retryable
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const validationError = handleZodError(error)
    const apiError = validationError.toAPIError()
    
    return new Response(JSON.stringify({
      error: true,
      type: apiError.type,
      message: getUserFriendlyMessage(apiError),
      code: apiError.code,
      retryable: apiError.retryable,
      details: apiError.details
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Handle generic errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  const internalError = new InternalError(message, 'UNKNOWN_ERROR')
  const apiError = internalError.toAPIError()
  
  return new Response(JSON.stringify({
    error: true,
    type: apiError.type,
    message: getUserFriendlyMessage(apiError),
    code: apiError.code,
    retryable: apiError.retryable
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  })
}

function getStatusFromErrorType(type: ErrorType): number {
  switch (type) {
    case ErrorType.VALIDATION_ERROR:
      return 400
    case ErrorType.EXTERNAL_API_ERROR:
      return 502
    case ErrorType.RATE_LIMIT_ERROR:
      return 429
    case ErrorType.NETWORK_ERROR:
      return 503
    case ErrorType.INTERNAL_ERROR:
      return 500
    default:
      return 500
  }
}
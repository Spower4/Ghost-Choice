import { describe, it, expect, vi } from 'vitest'
import { generateShareId, isValidShareId, generateUniqueShareId } from '../share-id'

describe('Share ID utilities', () => {
  describe('generateShareId', () => {
    it('should generate share ID with default length', () => {
      const shareId = generateShareId()
      expect(shareId).toHaveLength(8)
      expect(shareId).toMatch(/^[A-Za-z0-9]+$/)
    })

    it('should generate share ID with custom length', () => {
      const shareId = generateShareId(12)
      expect(shareId).toHaveLength(12)
      expect(shareId).toMatch(/^[A-Za-z0-9]+$/)
    })

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateShareId()
      const id2 = generateShareId()
      expect(id1).not.toBe(id2)
    })

    it('should only contain alphanumeric characters', () => {
      const shareId = generateShareId(20)
      expect(shareId).toMatch(/^[A-Za-z0-9]+$/)
    })
  })

  describe('isValidShareId', () => {
    it('should validate correct share IDs', () => {
      expect(isValidShareId('abc123')).toBe(true)
      expect(isValidShareId('ABC123')).toBe(true)
      expect(isValidShareId('aBc123XyZ')).toBe(true)
      expect(isValidShareId('123456789012')).toBe(true) // 12 chars
    })

    it('should reject invalid share IDs', () => {
      expect(isValidShareId('abc12')).toBe(false) // too short
      expect(isValidShareId('abcdefghijklm')).toBe(false) // too long
      expect(isValidShareId('abc-123')).toBe(false) // contains hyphen
      expect(isValidShareId('abc_123')).toBe(false) // contains underscore
      expect(isValidShareId('abc 123')).toBe(false) // contains space
      expect(isValidShareId('abc@123')).toBe(false) // contains special char
      expect(isValidShareId('')).toBe(false) // empty string
    })

    it('should handle edge cases', () => {
      expect(isValidShareId('abcdef')).toBe(true) // minimum length
      expect(isValidShareId('abcdefghijkl')).toBe(true) // maximum length
    })
  })

  describe('generateUniqueShareId', () => {
    it('should generate unique ID when no collision', async () => {
      const checkExists = vi.fn().mockResolvedValue(false)
      
      const shareId = await generateUniqueShareId(checkExists)
      
      expect(shareId).toHaveLength(8)
      expect(shareId).toMatch(/^[A-Za-z0-9]+$/)
      expect(checkExists).toHaveBeenCalledWith(shareId)
    })

    it('should retry on collision and return unique ID', async () => {
      const checkExists = vi.fn()
        .mockResolvedValueOnce(true) // first ID exists
        .mockResolvedValueOnce(false) // second ID is unique
      
      const shareId = await generateUniqueShareId(checkExists)
      
      expect(shareId).toHaveLength(8)
      expect(checkExists).toHaveBeenCalledTimes(2)
    })

    it('should return longer ID after max attempts', async () => {
      const checkExists = vi.fn().mockResolvedValue(true) // always exists
      
      const shareId = await generateUniqueShareId(checkExists, 3)
      
      expect(shareId).toHaveLength(12) // fallback to longer ID
      expect(checkExists).toHaveBeenCalledTimes(3)
    })

    it('should respect custom max attempts', async () => {
      const checkExists = vi.fn().mockResolvedValue(true)
      
      await generateUniqueShareId(checkExists, 5)
      
      expect(checkExists).toHaveBeenCalledTimes(5)
    })

    it('should handle async check function errors', async () => {
      const checkExists = vi.fn().mockRejectedValue(new Error('Database error'))
      
      await expect(generateUniqueShareId(checkExists)).rejects.toThrow('Database error')
    })
  })
})
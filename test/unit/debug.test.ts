import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DEBUG_START,
  DEBUG_END,
  encodeKeyToInvisible,
  toDebug,
} from '../../src/runtime/helpers/debug'

// Mock the settings module before importing the debug helpers
vi.mock('#nuxt-easy-texts/settings', () => ({
  advancedDebugEnabled: false,
}))

describe('debug helpers', () => {
  describe('constants', () => {
    it('DEBUG_START is Invisible Separator (U+2063)', () => {
      expect(DEBUG_START).toBe('\u2063')
    })

    it('DEBUG_END is Word Joiner (U+2060)', () => {
      expect(DEBUG_END).toBe('\u2060')
    })
  })

  describe('encodeKeyToInvisible', () => {
    it('encodes a simple key to invisible characters', () => {
      const result = encodeKeyToInvisible('a')
      // 'a' = 97 = 01100001 in binary
      // Should be wrapped with DEBUG_START and DEBUG_END
      expect(result.startsWith(DEBUG_START)).toBe(true)
      expect(result.endsWith(DEBUG_END)).toBe(true)
    })

    it('produces only zero-width characters between markers', () => {
      const result = encodeKeyToInvisible('test')
      // Extract the encoded part (between start and end markers)
      const encoded = result.slice(1, -1)
      // Should only contain zero-width space (U+200B) and zero-width non-joiner (U+200C)
      for (const char of encoded) {
        expect(['\u200B', '\u200C']).toContain(char)
      }
    })

    it('encodes each character as 8 bits', () => {
      const result = encodeKeyToInvisible('a')
      // Remove markers, should have 8 characters (one byte)
      const encoded = result.slice(1, -1)
      expect(encoded.length).toBe(8)
    })

    it('encodes multiple characters correctly', () => {
      const result = encodeKeyToInvisible('ab')
      // Remove markers, should have 16 characters (two bytes)
      const encoded = result.slice(1, -1)
      expect(encoded.length).toBe(16)
    })

    it('encodes special characters', () => {
      const result = encodeKeyToInvisible('test.key')
      // 8 characters * 8 bits = 64 zero-width characters
      const encoded = result.slice(1, -1)
      expect(encoded.length).toBe(64)
    })

    it('encodes unicode characters', () => {
      // Note: This only works for characters in the first 256 code points
      // because we're using 8 bits per character
      const result = encodeKeyToInvisible('é')
      const encoded = result.slice(1, -1)
      expect(encoded.length).toBe(8)
    })

    it('produces different output for different keys', () => {
      const result1 = encodeKeyToInvisible('key1')
      const result2 = encodeKeyToInvisible('key2')
      expect(result1).not.toBe(result2)
    })

    it('produces same output for same key', () => {
      const result1 = encodeKeyToInvisible('my.key')
      const result2 = encodeKeyToInvisible('my.key')
      expect(result1).toBe(result2)
    })

    it('handles empty string', () => {
      const result = encodeKeyToInvisible('')
      expect(result).toBe(DEBUG_START + DEBUG_END)
    })

    it('correctly encodes known binary pattern', () => {
      // 'A' = 65 = 01000001 in binary
      const result = encodeKeyToInvisible('A')
      const encoded = result.slice(1, -1)
      // 0 -> U+200B (zero-width space)
      // 1 -> U+200C (zero-width non-joiner)
      const expected = '\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C'
      expect(encoded).toBe(expected)
    })
  })

  describe('toDebug', () => {
    describe('when isDebug is false', () => {
      it('returns the text unchanged', () => {
        const result = toDebug('my.key', 'Hello World', false)
        expect(result).toBe('Hello World')
      })

      it('does not include the key', () => {
        const result = toDebug('my.key', 'Hello World', false)
        expect(result).not.toContain('my.key')
      })
    })

    describe('when isDebug is true and advancedDebugEnabled is false', () => {
      it('returns just the key', () => {
        const result = toDebug('my.key', 'Hello World', true)
        expect(result).toBe('my.key')
      })

      it('does not include the text', () => {
        const result = toDebug('my.key', 'Hello World', true)
        expect(result).not.toContain('Hello World')
      })
    })
  })
})

describe('toDebug with advancedDebugEnabled', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns text with invisible key prefix when advancedDebugEnabled is true', async () => {
    // Re-mock with advancedDebugEnabled = true
    vi.doMock('#nuxt-easy-texts/settings', () => ({
      advancedDebugEnabled: true,
    }))

    const { toDebug: toDebugAdvanced, DEBUG_START: START } = await import(
      '../../src/runtime/helpers/debug'
    )

    const result = toDebugAdvanced('my.key', 'Hello World', true)

    // Should start with the invisible key
    expect(result.startsWith(START)).toBe(true)
    // Should end with the visible text
    expect(result.endsWith('Hello World')).toBe(true)
    // Should be longer than just the text (includes invisible characters)
    expect(result.length).toBeGreaterThan('Hello World'.length)
  })

  it('still returns just text when isDebug is false even with advancedDebugEnabled', async () => {
    vi.doMock('#nuxt-easy-texts/settings', () => ({
      advancedDebugEnabled: true,
    }))

    const { toDebug: toDebugAdvanced } = await import(
      '../../src/runtime/helpers/debug'
    )

    const result = toDebugAdvanced('my.key', 'Hello World', false)
    expect(result).toBe('Hello World')
  })
})

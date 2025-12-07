import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import { falsy, fileExists, isSingleText } from '../../src/build/helpers/index'
import type {
  Extraction,
  ExtractionText,
  ExtractionPlural,
} from '../../src/build/types/extraction'

// Mock fs module
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
  existsSync: vi.fn(),
}))

describe('build helpers', () => {
  describe('falsy', () => {
    it('returns true for truthy values', () => {
      expect(falsy('hello')).toBe(true)
      expect(falsy(1)).toBe(true)
      expect(falsy(0)).toBe(true)
      expect(falsy('')).toBe(true)
      expect(falsy([])).toBe(true)
      expect(falsy({})).toBe(true)
      expect(falsy(false)).toBe(true)
    })

    it('returns false for null', () => {
      expect(falsy(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(falsy(undefined)).toBe(false)
    })

    it('can be used as array filter callback', () => {
      const items = [1, null, 2, undefined, 3, null]
      const filtered = items.filter(falsy)

      expect(filtered).toEqual([1, 2, 3])
    })

    it('filters out only null and undefined from mixed array', () => {
      const items = ['a', null, '', undefined, 0, false, 'b']
      const filtered = items.filter(falsy)

      expect(filtered).toEqual(['a', '', 0, false, 'b'])
    })
  })

  describe('fileExists', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns null for empty path', () => {
      expect(fileExists('')).toBe(null)
      expect(fileExists(undefined)).toBe(null)
    })

    it('returns path if file exists directly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = fileExists('/path/to/file.ts')

      expect(result).toBe('/path/to/file.ts')
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.ts')
    })

    it('returns path with extension if file exists with extension', () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // First call for direct path
        .mockReturnValueOnce(true) // Second call for path.ts

      const result = fileExists('/path/to/file')

      expect(result).toBe('/path/to/file.ts')
    })

    it('returns null if file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = fileExists('/path/to/nonexistent')

      expect(result).toBe(null)
    })

    it('tries multiple extensions', () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // Direct path
        .mockReturnValueOnce(false) // .ts
        .mockReturnValueOnce(true) // .js

      const result = fileExists('/path/to/file', ['ts', 'js'])

      expect(result).toBe('/path/to/file.js')
    })

    it('uses default extension ts', () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // Direct path
        .mockReturnValueOnce(true) // .ts

      const result = fileExists('/path/to/file')

      expect(result).toBe('/path/to/file.ts')
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.ts')
    })

    it('returns null if no extensions match', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = fileExists('/path/to/file', ['ts', 'js', 'mjs'])

      expect(result).toBe(null)
      expect(fs.existsSync).toHaveBeenCalledTimes(4) // direct + 3 extensions
    })
  })

  describe('isSingleText', () => {
    it('returns true for text extraction', () => {
      const extraction: ExtractionText = {
        type: 'text',
        key: 'hello',
        fullKey: 'hello',
        defaultText: 'Hello',
        filePath: '/path/to/file.vue',
      }

      expect(isSingleText(extraction)).toBe(true)
    })

    it('returns false for plural extraction', () => {
      const extraction: ExtractionPlural = {
        type: 'plural',
        key: 'items',
        fullKey: 'items',
        singular: 'One item',
        plural: '@count items',
        filePath: '/path/to/file.vue',
      }

      expect(isSingleText(extraction)).toBe(false)
    })

    it('can be used as type guard', () => {
      const textExtraction: Extraction = {
        type: 'text',
        key: 'hello',
        fullKey: 'hello',
        defaultText: 'Hello',
        filePath: '/path/to/file.vue',
      }

      const pluralExtraction: Extraction = {
        type: 'plural',
        key: 'items',
        fullKey: 'items',
        singular: 'One item',
        plural: '@count items',
        filePath: '/path/to/file.vue',
      }

      if (isSingleText(textExtraction)) {
        // TypeScript should know this is ExtractionText
        expect(textExtraction.defaultText).toBe('Hello')
      }

      if (!isSingleText(pluralExtraction)) {
        // TypeScript should know this is ExtractionPlural
        expect((pluralExtraction as ExtractionPlural).singular).toBe('One item')
      }
    })
  })
})

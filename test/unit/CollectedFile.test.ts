import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CollectedFile } from '../../src/build/classes/CollectedFile'
import { Cache } from '../../src/build/classes/Cache'
import { promises as fs } from 'node:fs'

// Mock fs promises
vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}))

describe('CollectedFile', () => {
  let cache: Cache

  beforeEach(() => {
    cache = new Cache()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('creates a CollectedFile with file path and contents', () => {
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        `const text = $texts('hello', 'Hello')`,
      )

      expect(file.filePath).toBe('/path/to/file.vue')
      expect(file.fileContents).toBe(`const text = $texts('hello', 'Hello')`)
    })

    it('extracts $texts calls from content', () => {
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        `const text = $texts('hello.world', 'Hello World')`,
      )

      expect(file.extractions).toHaveLength(1)
      expect(file.extractions[0]!.fullKey).toBe('hello.world')
      expect(file.extractions[0]!.type).toBe('text')
    })

    it('extracts $textsPlural calls from content', () => {
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        `const text = $textsPlural('items.count', count, 'One item', '@count items')`,
      )

      expect(file.extractions).toHaveLength(1)
      expect(file.extractions[0]!.fullKey).toBe('items.count')
      expect(file.extractions[0]!.type).toBe('plural')
    })

    it('extracts both $texts and $textsPlural calls', () => {
      const content = `
        const single = $texts('single.key', 'Single text')
        const plural = $textsPlural('plural.key', count, 'One', 'Many')
      `
      const file = new CollectedFile(cache, '/path/to/file.vue', content)

      expect(file.extractions).toHaveLength(2)
      expect(file.extractions.find((e) => e.type === 'text')).toBeDefined()
      expect(file.extractions.find((e) => e.type === 'plural')).toBeDefined()
    })

    it('handles content without any text calls', () => {
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        `const text = 'Hello World'`,
      )

      expect(file.extractions).toHaveLength(0)
      expect(file.errors).toHaveLength(0)
    })
  })

  describe('fromFilePath', () => {
    it('creates CollectedFile from file path', async () => {
      const content = `const text = $texts('hello', 'Hello')`
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(content))

      const file = await CollectedFile.fromFilePath(cache, '/path/to/file.vue')

      expect(file).not.toBeNull()
      expect(file!.filePath).toBe('/path/to/file.vue')
      expect(file!.fileContents).toBe(content)
    })

    it('returns null for empty file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(''))

      const file = await CollectedFile.fromFilePath(cache, '/path/to/empty.vue')

      expect(file).toBeNull()
    })
  })

  describe('update', () => {
    it('returns false when contents unchanged', async () => {
      const content = `const text = $texts('hello', 'Hello')`
      const file = new CollectedFile(cache, '/path/to/file.vue', content)

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(content))

      const changed = await file.update()

      expect(changed).toBe(false)
    })

    it('returns true when contents changed', async () => {
      const originalContent = `const text = $texts('hello', 'Hello')`
      const newContent = `const text = $texts('goodbye', 'Goodbye')`
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        originalContent,
      )

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(newContent))

      const changed = await file.update()

      expect(changed).toBe(true)
      expect(file.fileContents).toBe(newContent)
    })

    it('returns false when content changes but extractions are same', async () => {
      const originalContent = `const text = $texts('hello', 'Hello') // comment`
      const newContent = `const text = $texts('hello', 'Hello') // different comment`
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        originalContent,
      )

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(newContent))

      const changed = await file.update()

      // The key (based on extractions) should be the same
      expect(changed).toBe(false)
    })

    it('updates extractions when content changes', async () => {
      const originalContent = `const text = $texts('hello', 'Hello')`
      const newContent = `const text = $texts('goodbye', 'Goodbye')`
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        originalContent,
      )

      expect(file.extractions[0]!.fullKey).toBe('hello')

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(newContent))
      await file.update()

      expect(file.extractions[0]!.fullKey).toBe('goodbye')
    })
  })

  describe('error handling', () => {
    it('captures errors for invalid $texts calls', () => {
      // This will cause a parse error because the AST won't match expected structure
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        `$texts(someVariable)`, // Variable instead of string literal
      )

      expect(file.errors).toHaveLength(1)
      expect(file.errors[0]!.filePath).toBe('/path/to/file.vue')
    })

    it('handleError captures error message', () => {
      const file = new CollectedFile(cache, '/path/to/file.vue', '')
      const call = { code: '$texts(invalid)', start: 0, end: 15 }

      file.handleError(new Error('Test error message'), call)

      expect(file.errors).toHaveLength(1)
      expect(file.errors[0]!.message).toBe('Test error message')
      expect(file.errors[0]!.call).toBe(call)
      expect(file.errors[0]!.filePath).toBe('/path/to/file.vue')
    })

    it('handleError uses default message for non-Error objects', () => {
      const file = new CollectedFile(cache, '/path/to/file.vue', '')
      const call = { code: '$texts(invalid)', start: 0, end: 15 }

      file.handleError('string error', call)

      expect(file.errors[0]!.message).toBe('Failed to parse text arguments.')
    })
  })

  describe('caching', () => {
    it('uses cache for repeated extractions', () => {
      const content = `
        const a = $texts('same.key', 'Same text')
        const b = $texts('same.key', 'Same text')
      `
      const file = new CollectedFile(cache, '/path/to/file.vue', content)

      // Both extractions should be found
      expect(file.extractions).toHaveLength(2)

      // Second extraction should come from cache
      expect(cache.singleCache.has(`$texts('same.key', 'Same text')`)).toBe(
        true,
      )
    })

    it('caches plural extractions', () => {
      const content = `$textsPlural('items', count, 'One', '@count')`
      new CollectedFile(cache, '/path/to/file.vue', content)

      expect(
        cache.pluralCache.has(`$textsPlural('items', count, 'One', '@count')`),
      ).toBe(true)
    })
  })

  describe('extraction with context', () => {
    it('extracts key with context prefix (context.key format)', () => {
      // parseKey splits by first dot: 'context.key' => context='context', key='key'
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        `$texts('global.homepage', 'Text')`,
      )

      expect(file.extractions[0]!.fullKey).toBe('global.homepage')
      expect(file.extractions[0]!.key).toBe('homepage')
      expect(file.extractions[0]!.context).toBe('global')
    })

    it('extracts key without context (single word)', () => {
      const file = new CollectedFile(
        cache,
        '/path/to/file.vue',
        `$texts('search', 'Text')`,
      )

      expect(file.extractions[0]!.fullKey).toBe('search')
      expect(file.extractions[0]!.key).toBe('search')
      expect(file.extractions[0]!.context).toBeUndefined()
    })
  })

  describe('multiple files with shared cache', () => {
    it('shares cache between multiple CollectedFile instances', () => {
      const content1 = `$texts('shared.key', 'Shared')`
      const content2 = `$texts('shared.key', 'Shared')`

      new CollectedFile(cache, '/path/to/file1.vue', content1)
      const file2 = new CollectedFile(cache, '/path/to/file2.vue', content2)

      // Second file should use cached extraction
      expect(file2.extractions).toHaveLength(1)
      expect(cache.singleCache.size).toBe(1)
    })
  })
})

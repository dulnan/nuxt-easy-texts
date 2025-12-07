import { describe, it, expect } from 'vitest'
import { parse } from 'acorn'
import type { Node } from 'estree'
import { transformTexts } from '../../src/build/vitePlugin'

// Use acorn as the parser (same approach the vite plugin uses via unplugin)
const parseFn = (code: string): Node =>
  parse(code, { ecmaVersion: 'latest' }) as Node

// Helper to get just the code string from transformTexts
const transform = (source: string) => transformTexts(source, parseFn).code

describe('vitePlugin transformTexts', () => {
  describe('$texts transform', () => {
    it('should strip default text from $texts calls', () => {
      const source = `$texts('myKey', 'Default text')`
      const result = transform(source)
      expect(result).toBe(`$texts('myKey')`)
    })

    it('should preserve replacements argument', () => {
      const source = `$texts('myKey', 'Hello @name', { '@name': name })`
      const result = transform(source)
      expect(result).toContain(`$texts('myKey'`)
      expect(result).toContain(`'@name': name`)
    })

    it('should handle multiple different $texts calls', () => {
      const source = `const a = $texts('key1', 'Text 1')
const b = $texts('key2', 'Text 2')`
      const result = transform(source)
      expect(result).toContain(`$texts('key1')`)
      expect(result).toContain(`$texts('key2')`)
    })

    it('should handle text with percentage signs', () => {
      const source = `$texts('key', 'Enter 40% here')`
      const result = transform(source)
      expect(result).toBe(`$texts('key')`)
    })

    it('should handle text with dollar signs and special characters', () => {
      const source = `$texts('key', 'Price: $100 (50% off)')`
      const result = transform(source)
      expect(result).toBe(`$texts('key')`)
    })
  })

  describe('$textsPlural transform', () => {
    it('should strip singular and plural texts', () => {
      const source = `$textsPlural('items', count, 'One item', '@count items')`
      const result = transform(source)
      expect(result).toBe(`$textsPlural('items', count)`)
    })

    it('should preserve replacements argument (5th arg)', () => {
      const source = `$textsPlural('items', count, 'One item', '@count items', { '@name': name })`
      const result = transform(source)
      expect(result).toContain(`$textsPlural('items', count`)
      expect(result).toContain(`'@name': name`)
    })

    it('should handle percentage in plural texts', () => {
      const source = `$textsPlural('discount', count, '40% off', '@count% off')`
      const result = transform(source)
      expect(result).toBe(`$textsPlural('discount', count)`)
    })
  })

  describe('duplicate calls (regression tests for s.replace bug)', () => {
    // These tests verify the fix for the bug where duplicate identical
    // $texts/$textsPlural calls were not all transformed correctly.
    // The bug was caused by using MagicString.replace() which only replaces
    // the first occurrence when searching by string pattern.
    // The fix uses s.overwrite() with exact character positions.

    it('should transform ALL identical $texts calls', () => {
      const source = `<p v-if="showFirst">{{ $texts('shared.key', 'Same default text') }}</p>
<p v-else>{{ $texts('shared.key', 'Same default text') }}</p>`

      const result = transform(source)

      // Both calls must be transformed - this was the bug
      expect(result).toBe(
        `<p v-if="showFirst">{{ $texts('shared.key') }}</p>
<p v-else>{{ $texts('shared.key') }}</p>`,
      )
    })

    it('should transform ALL identical $textsPlural calls', () => {
      const source = `<li>{{ $textsPlural('items', count, 'One thing', '@count things') }}</li>
<li>{{ $textsPlural('items', count, 'One thing', '@count things') }}</li>`

      const result = transform(source)

      // Both calls must be transformed - this was the bug
      expect(result).toBe(
        `<li>{{ $textsPlural('items', count) }}</li>
<li>{{ $textsPlural('items', count) }}</li>`,
      )
    })

    it('should transform three identical $texts calls', () => {
      const source = `$texts('k', 'A') + $texts('k', 'A') + $texts('k', 'A')`

      const result = transform(source)

      expect(result).toBe(`$texts('k') + $texts('k') + $texts('k')`)
    })

    it('should handle mixed $texts and $textsPlural calls', () => {
      const source = `{{ $texts('title', 'Title') }}
{{ $textsPlural('items', count, 'One', 'Many') }}
{{ $texts('title', 'Title') }}`

      const result = transform(source)

      expect(result).toBe(`{{ $texts('title') }}
{{ $textsPlural('items', count) }}
{{ $texts('title') }}`)
    })
  })
})

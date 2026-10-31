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

  describe('explicitly empty default texts', () => {
    // $texts('key', undefined, replacements) passes replacements without a
    // default text. Left untransformed, production would read the undefined
    // as the replacements and drop the real ones.

    /**
     * The arguments of the transformed call, as source code.
     */
    const transformedArgs = (source: string) => {
      const result = transform(source)
      const program = parseFn(result) as any
      return program.body[0].expression.arguments.map((arg: any) =>
        result.slice(arg.start, arg.end).replace(/\s+/g, ' '),
      )
    }

    it.each(['undefined', 'null', 'void 0'])(
      'strips %s in the $texts default text position',
      (empty) => {
        expect(
          transformedArgs(`$texts('myKey', ${empty}, { '@name': name })`),
        ).toEqual([`'myKey'`, `{ '@name': name }`])
      },
    )

    it.each(['undefined', 'null', 'void 0'])(
      'strips %s in the $textsPlural default text positions',
      (empty) => {
        expect(
          transformedArgs(
            `$textsPlural('items', count, ${empty}, ${empty}, { '@name': name })`,
          ),
        ).toEqual([`'items'`, 'count', `{ '@name': name }`])
      },
    )

    it('produces the same result when run twice', () => {
      const once = transform(`$texts('myKey', undefined, { '@name': name })`)
      expect(transform(once)).toBe(once)
    })
  })

  describe('idempotence (regression tests for double-transform bug)', () => {
    // The transform may run more than once on the same source (once on the
    // parent .vue file, again on its ?vue&type=script sub-module). Without
    // an idempotence guard, the second pass would treat the replacements
    // object as the default text and strip it.

    it('should be a no-op for an already-transformed $texts call with replacements', () => {
      const source = `$texts('myKey', { '@name': name })`
      const result = transform(source)
      expect(result).toContain(`$texts('myKey'`)
      expect(result).toContain(`'@name': name`)
    })

    it('should be a no-op for an already-transformed $textsPlural call with replacements', () => {
      const source = `$textsPlural('items', count, { '@name': name })`
      const result = transform(source)
      expect(result).toContain(`$textsPlural('items', count`)
      expect(result).toContain(`'@name': name`)
    })

    it('should produce the same result when run twice on $texts with replacements', () => {
      const source = `$texts('myKey', 'Hello @name', { '@name': name })`
      const once = transform(source)
      const twice = transform(once)
      expect(twice).toBe(once)
      expect(twice).toContain(`'@name': name`)
    })

    it('should produce the same result when run twice on $textsPlural with replacements', () => {
      const source = `$textsPlural('items', count, 'One @item', '@count @items', { '@item': item })`
      const once = transform(source)
      const twice = transform(once)
      expect(twice).toBe(once)
      expect(twice).toContain(`'@item': item`)
    })
  })

  describe('template literal defaults', () => {
    // The collector accepts both string literals and template literals as a
    // default text (extractLiteral() in src/build/helpers/ast.ts), so the vite
    // plugin has to strip both. An earlier idempotence guard tested for
    // "not a Literal", which silently skipped every backtick default: the call
    // shipped untransformed and the production runtime - whose signature is
    // $texts(key, replacements) - then read the default text as the
    // replacements argument and discarded the real replacements.

    it('should strip a template literal default from $texts', () => {
      const source = "$texts('k', `Default text`)"
      expect(transform(source)).toBe(`$texts('k')`)
    })

    it('should strip a template literal default but keep replacements', () => {
      const source = "$texts('k', `Hello @name`, { '@name': name })"
      const result = transform(source)
      expect(result).toContain(`$texts('k'`)
      expect(result).toContain(`'@name': name`)
      expect(result).not.toContain('Hello @name')
    })

    it('should strip an interpolated template literal default', () => {
      // Defensive only: the collector rejects interpolated defaults during
      // validation (see extractLiteral), so a build never reaches the plugin
      // with one. The plugin still handles it rather than leaving a
      // half-transformed call behind.
      const source = "$texts('k', `Hello ${fallback}`, { '@name': name })"
      const result = transform(source)
      expect(result).toContain(`'@name': name`)
      expect(result).not.toContain('fallback')
    })

    it('should strip template literal singular in $textsPlural', () => {
      const source =
        "$textsPlural('k', count, `1 @thing`, '@count @things', { '@thing': t })"
      const result = transform(source)
      expect(result).toContain(`$textsPlural('k', count`)
      expect(result).toContain(`'@thing': t`)
      expect(result).not.toContain('1 @thing')
      expect(result).not.toContain('@count @things')
    })

    it('should strip template literal plural in $textsPlural', () => {
      const source =
        "$textsPlural('k', count, '1 @thing', `@count @things`, { '@thing': t })"
      const result = transform(source)
      expect(result).toContain(`'@thing': t`)
      expect(result).not.toContain('@count @things')
    })

    it('should stay idempotent for template literal defaults', () => {
      const source = "$texts('k', `Hello @name`, { '@name': name })"
      const once = transform(source)
      const twice = transform(once)
      expect(twice).toBe(once)
      expect(twice).toContain(`'@name': name`)
    })

    it('should stay idempotent for template literal plural defaults', () => {
      const source =
        "$textsPlural('k', count, `1 @thing`, `@count @things`, { '@thing': t })"
      const once = transform(source)
      const twice = transform(once)
      expect(twice).toBe(once)
      expect(twice).toContain(`'@thing': t`)
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

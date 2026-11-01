import { describe, it, expect, vi } from 'vitest'
import {
  getSingleText,
  getPluralTexts,
} from '../../src/runtime/helpers/textsFunctions'
import type { TextsState, Replacements } from '../../src/runtime/types'

// Mock the settings module (required by debug.ts)
vi.mock('#nuxt-easy-texts/settings', () => ({
  advancedDebugEnabled: false,
}))

describe('textsFunctions', () => {
  describe('getSingleText', () => {
    describe('when texts is null', () => {
      it('returns the key', () => {
        const result = getSingleText('my.key', false, null)
        expect(result).toBe('my.key')
      })

      it('returns the key even with replacements', () => {
        const result = getSingleText('my.key', false, null, {
          '@name': 'Alice',
        })
        expect(result).toBe('my.key')
      })
    })

    describe('when key is not found in texts', () => {
      it('returns the key', () => {
        const texts: TextsState = { 'other.key': 'Other text' }
        const result = getSingleText('my.key', false, texts)
        expect(result).toBe('my.key')
      })
    })

    describe('when key exists as a string', () => {
      it('returns the text', () => {
        const texts: TextsState = { 'my.key': 'Hello World' }
        const result = getSingleText('my.key', false, texts)
        expect(result).toBe('Hello World')
      })

      it('applies single replacement', () => {
        const texts: TextsState = { greeting: 'Hello @name!' }
        const replacements: Replacements = { '@name': 'Alice' }
        const result = getSingleText('greeting', false, texts, replacements)
        expect(result).toBe('Hello Alice!')
      })

      it('applies multiple replacements', () => {
        const texts: TextsState = { greeting: 'Hello @name from @place!' }
        const replacements: Replacements = {
          '@name': 'Alice',
          '@place': 'Wonderland',
        }
        const result = getSingleText('greeting', false, texts, replacements)
        expect(result).toBe('Hello Alice from Wonderland!')
      })

      it('applies replacements with numbers', () => {
        const texts: TextsState = { price: 'Total: $@amount' }
        const replacements: Replacements = { '@amount': 99.99 }
        const result = getSingleText('price', false, texts, replacements)
        expect(result).toBe('Total: $99.99')
      })

      it('replaces all occurrences of the same placeholder', () => {
        const texts: TextsState = { repeat: '@name and @name again' }
        const replacements: Replacements = { '@name': 'Bob' }
        const result = getSingleText('repeat', false, texts, replacements)
        expect(result).toBe('Bob and Bob again')
      })

      it('handles empty replacements object', () => {
        const texts: TextsState = { 'my.key': 'Hello @name!' }
        const result = getSingleText('my.key', false, texts, {})
        expect(result).toBe('Hello @name!')
      })

      it('handles undefined replacements', () => {
        const texts: TextsState = { 'my.key': 'Hello World' }
        const result = getSingleText('my.key', false, texts, undefined)
        expect(result).toBe('Hello World')
      })
    })

    describe('when key exists as an array (plural text used as single)', () => {
      it('returns the first element (singular form)', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getSingleText('items', false, texts)
        expect(result).toBe('One item')
      })

      it('applies replacements to the first element', () => {
        const texts: TextsState = {
          items: ['@name has one item', '@name has @count items'],
        }
        const replacements: Replacements = { '@name': 'Alice' }
        const result = getSingleText('items', false, texts, replacements)
        expect(result).toBe('Alice has one item')
      })

      it('returns key for empty array', () => {
        const texts: TextsState = { items: [] }
        const result = getSingleText('items', false, texts)
        expect(result).toBe('items')
      })
    })

    describe('debug mode', () => {
      it('returns the key when isDebug is true', () => {
        const texts: TextsState = { 'my.key': 'Hello World' }
        const result = getSingleText('my.key', true, texts)
        expect(result).toBe('my.key')
      })

      it('returns the key when isDebug is true even with replacements', () => {
        const texts: TextsState = { greeting: 'Hello @name!' }
        const replacements: Replacements = { '@name': 'Alice' }
        const result = getSingleText('greeting', true, texts, replacements)
        expect(result).toBe('greeting')
      })
    })
  })

  describe('getPluralTexts', () => {
    describe('when texts is null', () => {
      it('returns the key', () => {
        const result = getPluralTexts('items', 5, false, null)
        expect(result).toBe('items')
      })

      it('returns the key regardless of count', () => {
        expect(getPluralTexts('items', 1, false, null)).toBe('items')
        expect(getPluralTexts('items', 0, false, null)).toBe('items')
        expect(getPluralTexts('items', 100, false, null)).toBe('items')
      })
    })

    describe('when key is not found in texts', () => {
      it('returns the key', () => {
        const texts: TextsState = { 'other.key': ['One', 'Many'] }
        const result = getPluralTexts('items', 5, false, texts)
        expect(result).toBe('items')
      })
    })

    describe('when key exists but is not a valid plural (array of 2)', () => {
      it('returns the key for string value', () => {
        const texts: TextsState = { items: 'Just a string' }
        const result = getPluralTexts('items', 5, false, texts)
        expect(result).toBe('items')
      })

      it('returns the key for single-element array', () => {
        const texts: TextsState = { items: ['Only one'] }
        const result = getPluralTexts('items', 5, false, texts)
        expect(result).toBe('items')
      })

      it('returns the key for array with more than 2 elements', () => {
        const texts: TextsState = { items: ['One', 'Two', 'Three'] }
        const result = getPluralTexts('items', 5, false, texts)
        expect(result).toBe('items')
      })
    })

    describe('singular form (count === 1)', () => {
      it('returns singular text for count 1 (number)', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 1, false, texts)
        expect(result).toBe('One item')
      })

      it('returns singular text for count "1" (string)', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', '1', false, texts)
        expect(result).toBe('One item')
      })

      it('applies replacements to singular text', () => {
        const texts: TextsState = {
          items: ['@name has one item', '@name has @count items'],
        }
        const replacements: Replacements = { '@name': 'Alice' }
        const result = getPluralTexts('items', 1, false, texts, replacements)
        expect(result).toBe('Alice has one item')
      })
    })

    describe('plural form (count !== 1)', () => {
      it('returns plural text with @count replaced for count > 1', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 5, false, texts)
        expect(result).toBe('5 items')
      })

      it('returns plural text with @count replaced for count 0', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 0, false, texts)
        expect(result).toBe('0 items')
      })

      it('returns plural text with @count replaced for count 2', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 2, false, texts)
        expect(result).toBe('2 items')
      })

      it('returns plural text with @count replaced for string count', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', '10', false, texts)
        expect(result).toBe('10 items')
      })

      it('handles null count (uses 0)', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', null, false, texts)
        expect(result).toBe('0 items')
      })

      it('handles undefined count (uses 0)', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', undefined, false, texts)
        expect(result).toBe('0 items')
      })

      it('applies replacements to plural text', () => {
        const texts: TextsState = {
          items: ['@name has one item', '@name has @count items'],
        }
        const replacements: Replacements = { '@name': 'Bob' }
        const result = getPluralTexts('items', 3, false, texts, replacements)
        expect(result).toBe('Bob has 3 items')
      })

      it('applies multiple replacements to plural text', () => {
        const texts: TextsState = {
          cart: ['@user: one @item', '@user: @count @item'],
        }
        const replacements: Replacements = {
          '@user': 'Alice',
          '@item': 'products',
        }
        const result = getPluralTexts('cart', 5, false, texts, replacements)
        expect(result).toBe('Alice: 5 products')
      })

      it('handles @count appearing multiple times', () => {
        const texts: TextsState = {
          items: ['One', '@count items (@count total)'],
        }
        const result = getPluralTexts('items', 7, false, texts)
        expect(result).toBe('7 items (7 total)')
      })

      it('handles text without @count placeholder', () => {
        const texts: TextsState = { items: ['One item', 'Multiple items'] }
        const result = getPluralTexts('items', 5, false, texts)
        expect(result).toBe('Multiple items')
      })
    })

    describe('debug mode', () => {
      it('returns the key when isDebug is true (singular)', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 1, true, texts)
        expect(result).toBe('items')
      })

      it('returns the key when isDebug is true (plural)', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 5, true, texts)
        expect(result).toBe('items')
      })

      it('returns the key when isDebug is true even with replacements', () => {
        const texts: TextsState = { items: ['@name: one', '@name: @count'] }
        const replacements: Replacements = { '@name': 'Alice' }
        const result = getPluralTexts('items', 5, true, texts, replacements)
        expect(result).toBe('items')
      })
    })

    describe('edge cases', () => {
      it('handles negative count as plural', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', -5, false, texts)
        expect(result).toBe('-5 items')
      })

      it('handles decimal count', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 2.5, false, texts)
        expect(result).toBe('2.5 items')
      })

      it('handles very large count', () => {
        const texts: TextsState = { items: ['One item', '@count items'] }
        const result = getPluralTexts('items', 1000000, false, texts)
        expect(result).toBe('1000000 items')
      })
    })
  })

  describe('dev-mode default fallback', () => {
    // In dev mode the runtime forwards the call's default text(s) so the UI
    // can render something sensible while a freshly-added (post-HMR) key
    // hasn't been picked up by the loader yet. The helpers only fall back
    // when the translation isn't found.

    describe('getSingleText', () => {
      it('uses defaultText when the key is not in texts', () => {
        const texts: TextsState = { 'other.key': 'Other' }
        expect(
          getSingleText('missing.key', false, texts, undefined, 'My default'),
        ).toBe('My default')
      })

      it('uses defaultText when texts is null', () => {
        expect(
          getSingleText('missing.key', false, null, undefined, 'My default'),
        ).toBe('My default')
      })

      it('applies replacements to the defaultText fallback', () => {
        const replacements: Replacements = { '@name': 'Alice' }
        expect(
          getSingleText(
            'missing.key',
            false,
            null,
            replacements,
            'Hello @name!',
          ),
        ).toBe('Hello Alice!')
      })

      it('prefers the loaded translation over defaultText', () => {
        const texts: TextsState = { 'my.key': 'Loaded text' }
        expect(
          getSingleText('my.key', false, texts, undefined, 'My default'),
        ).toBe('Loaded text')
      })

      it('returns the key in debug mode even when defaultText is provided', () => {
        expect(
          getSingleText('missing.key', true, null, undefined, 'My default'),
        ).toBe('missing.key')
      })

      it('returns the key when defaultText is undefined and key is missing', () => {
        // Production path: vite plugin strips the default, runtime passes
        // undefined here, so we still return the key.
        expect(getSingleText('missing.key', false, null)).toBe('missing.key')
      })
    })

    describe('getPluralTexts', () => {
      it('uses singular fallback for count 1 when key is missing', () => {
        expect(
          getPluralTexts(
            'missing',
            1,
            false,
            null,
            undefined,
            'One item',
            '@count items',
          ),
        ).toBe('One item')
      })

      it('uses plural fallback with @count substitution when key is missing', () => {
        expect(
          getPluralTexts(
            'missing',
            5,
            false,
            null,
            undefined,
            'One item',
            '@count items',
          ),
        ).toBe('5 items')
      })

      it('uses plural fallback for count 0', () => {
        expect(
          getPluralTexts(
            'missing',
            0,
            false,
            null,
            undefined,
            'One item',
            '@count items',
          ),
        ).toBe('0 items')
      })

      it('applies replacements to the fallback text', () => {
        const replacements: Replacements = { '@name': 'Alice' }
        expect(
          getPluralTexts(
            'missing',
            5,
            false,
            null,
            replacements,
            '@name has one item',
            '@name has @count items',
          ),
        ).toBe('Alice has 5 items')
      })

      it('prefers the loaded translation over fallbacks', () => {
        const texts: TextsState = {
          items: ['Loaded singular', 'Loaded @count'],
        }
        expect(
          getPluralTexts(
            'items',
            5,
            false,
            texts,
            undefined,
            'Default one',
            'Default @count',
          ),
        ).toBe('Loaded 5')
      })

      it('does not fall back when only one of singular/plural is provided', () => {
        // Defensive: incomplete fallback args are ignored, returning the key.
        expect(
          getPluralTexts(
            'missing',
            5,
            false,
            null,
            undefined,
            'One item',
            undefined,
          ),
        ).toBe('missing')
        expect(
          getPluralTexts(
            'missing',
            5,
            false,
            null,
            undefined,
            undefined,
            '@count items',
          ),
        ).toBe('missing')
      })

      it('returns the key in debug mode even when fallbacks are provided', () => {
        expect(
          getPluralTexts(
            'missing',
            5,
            true,
            null,
            undefined,
            'One item',
            '@count items',
          ),
        ).toBe('missing')
      })

      it('returns the key when no fallbacks are provided and key is missing', () => {
        // Production path mirror.
        expect(getPluralTexts('missing', 5, false, null)).toBe('missing')
      })
    })
  })

  // Replacement values often come from user data (a name, a search term).
  // String.prototype.replace treats `$&`, `` $` ``, `$'` and `$$` in a string
  // replacement as patterns, so they must be inserted literally instead.
  describe('replacement values containing $ patterns', () => {
    const patterns = ['$&', '$`', "$'", '$$', '$1', '$<name>']

    it.each(patterns)('inserts %s literally in a single text', (value) => {
      const texts: TextsState = { greeting: 'Hello @name, welcome!' }
      expect(getSingleText('greeting', false, texts, { '@name': value })).toBe(
        `Hello ${value}, welcome!`,
      )
    })

    it.each(patterns)('inserts %s literally in a plural text', (value) => {
      const texts: TextsState = {
        items: ['@name has one item', '@name has @count items'],
      }
      expect(getPluralTexts('items', 2, false, texts, { '@name': value })).toBe(
        `${value} has 2 items`,
      )
    })

    it.each(patterns)('inserts a count of %s literally', (value) => {
      const texts: TextsState = { items: ['One item', '@count items'] }
      expect(getPluralTexts('items', value, false, texts)).toBe(
        `${value} items`,
      )
    })

    it.each(patterns)(
      'inserts %s literally in the dev-mode default text',
      (value) => {
        expect(
          getSingleText(
            'missing',
            false,
            null,
            { '@name': value },
            'Hello @name!',
          ),
        ).toBe(`Hello ${value}!`)
        expect(
          getPluralTexts(
            'missing',
            value,
            false,
            null,
            undefined,
            'One item',
            '@count items',
          ),
        ).toBe(`${value} items`)
      },
    )
  })

  describe('placeholders', () => {
    it('replaces @count in the singular text', () => {
      const texts: TextsState = { items: ['@count item', '@count items'] }
      expect(getPluralTexts('items', 1, false, texts)).toBe('1 item')
      expect(getPluralTexts('items', '1', false, texts)).toBe('1 item')
    })

    it('replaces @count in the singular dev-mode default text', () => {
      expect(
        getPluralTexts(
          'missing',
          1,
          false,
          null,
          undefined,
          '@count item',
          '@count items',
        ),
      ).toBe('1 item')
    })

    it('does not replace placeholders inside inserted values', () => {
      const texts: TextsState = { greeting: 'Hi @name from @city' }
      expect(
        getSingleText('greeting', false, texts, {
          '@name': '@city',
          '@city': 'Bern',
        }),
      ).toBe('Hi @city from Bern')
    })

    it('matches the longest placeholder, whatever the order', () => {
      const texts: TextsState = { greeting: '@nameFull (@name)' }
      expect(
        getSingleText('greeting', false, texts, {
          '@name': 'Ann',
          '@nameFull': 'Ann Smith',
        }),
      ).toBe('Ann Smith (Ann)')
    })

    it('does not read a longer placeholder as @count', () => {
      const texts: TextsState = {
        items: ['One', '@countTotal total, @count shown'],
      }
      expect(
        getPluralTexts('items', 3, false, texts, { '@countTotal': 10 }),
      ).toBe('10 total, 3 shown')
    })

    it('lets an explicit @count replacement win', () => {
      const texts: TextsState = { items: ['One item', '@count items'] }
      expect(
        getPluralTexts('items', 3, false, texts, { '@count': 'three' }),
      ).toBe('three items')
    })

    it('treats placeholders with regex characters literally', () => {
      const texts: TextsState = { price: 'Total: $(amount) or .*' }
      expect(
        getSingleText('price', false, texts, { '$(amount)': 5, '.*': 'x' }),
      ).toBe('Total: 5 or x')
    })
  })
})

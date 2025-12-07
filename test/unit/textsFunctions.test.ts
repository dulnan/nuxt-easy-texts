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
        // Note: the current implementation only replaces first @count
        const result = getPluralTexts('items', 7, false, texts)
        expect(result).toBe('7 items (@count total)')
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
})

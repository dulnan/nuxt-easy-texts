import { defineEasyTextsLoader } from '../../../../src/loader'
import { computed } from '#imports'

type TextsData = Record<string, string | [string, string]>

const textsData: Record<string, TextsData> = {
  en: {
    'basic.key': '[LOADED] Basic text',
    'duplicate.key': '[LOADED] Duplicate text',
    'percentage.key': '[LOADED] Enter 40% here',
    'plural.key': ['[LOADED] One item', '[LOADED] @count items'],
    'plural.duplicate': ['[LOADED] One thing', '[LOADED] @count things'],
    // Texts with replacements
    'greeting.key': '[LOADED] Hello @name!',
    'greeting.complex': '[LOADED] Welcome @name to @place!',
    'price.key': '[LOADED] Price: @price (@discount off)',
    // Plural texts with replacements
    'items.user': [
      '[LOADED] @name has one item',
      '[LOADED] @name has @count items',
    ],
    'cart.summary': [
      '[LOADED] @user: one product (@price)',
      '[LOADED] @user: @count products (@price)',
    ],
    // Debug mode test texts
    'debug.test': '[EN] Debug test text',
    'override.test': '[EN] Override test text',
  },
  de: {
    'basic.key': '[GELADEN] Basistext',
    'duplicate.key': '[GELADEN] Doppelter Text',
    'percentage.key': '[GELADEN] Geben Sie 40% ein',
    'plural.key': ['[GELADEN] Ein Element', '[GELADEN] @count Elemente'],
    'plural.duplicate': ['[GELADEN] Eine Sache', '[GELADEN] @count Sachen'],
    // Texts with replacements
    'greeting.key': '[GELADEN] Hallo @name!',
    'greeting.complex': '[GELADEN] Willkommen @name in @place!',
    'price.key': '[GELADEN] Preis: @price (@discount Rabatt)',
    // Plural texts with replacements
    'items.user': [
      '[GELADEN] @name hat ein Element',
      '[GELADEN] @name hat @count Elemente',
    ],
    'cart.summary': [
      '[GELADEN] @user: ein Produkt (@price)',
      '[GELADEN] @user: @count Produkte (@price)',
    ],
    // Debug mode test texts
    'debug.test': '[DE] Debug Testtext',
    'override.test': '[DE] Override Testtext',
  },
}

export default defineEasyTextsLoader(() => {
  return {
    load(language: string): Promise<TextsData> {
      // Return texts for the requested language, fallback to 'en'
      const data = textsData[language] ?? textsData.en
      return Promise.resolve(data!)
    },
    currentLanguage() {
      // For tests, always return 'en' as the current language
      return computed(() => 'en')
    },
  }
})

import { defineEasyTextsLoader } from '../../../../src/loader'
import { computed } from '#imports'

export default defineEasyTextsLoader(() => {
  return {
    load(): Promise<Record<string, string | [string, string]>> {
      // Return loaded texts - these should appear if transform works correctly
      return Promise.resolve({
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
      })
    },
    reloadTrigger() {
      return computed(() => 'en')
    },
  }
})

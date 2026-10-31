import { defineEasyTextsLoader } from './../../src/loader'
import { $fetch, computed, useCurrentLanguage } from '#imports'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    load(language) {
      return $fetch('/api/load-texts', {
        query: {
          language,
        },
      }).then((v) => v || {})
    },
    currentLanguage() {
      return computed(() => language.value)
    },
  }
})

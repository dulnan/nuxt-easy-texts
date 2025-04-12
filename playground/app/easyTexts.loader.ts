import { defineEasyTextsLoader } from './../../src/loader'
import { computed, useCurrentLanguage } from '#imports'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    load() {
      return $fetch('/api/load-texts', {
        query: {
          language: language.value,
        },
      }).then((v) => v || {})
    },
    reloadTrigger() {
      return computed(() => language.value)
    },
  }
})

import { defineEasyTextsLoader } from '#nuxt-easy-texts/types'
import { computed, useCurrentLanguage } from '#imports'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    load() {
      return $fetch('/api/load-texts', {
        query: {
          language: language.value,
        },
      }).then((v) => v)
    },
    reloadTrigger() {
      return computed(() => language.value)
    },

    canDebug() {
      return true
    },
  }
})

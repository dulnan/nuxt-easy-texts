import { defineEasyTextsLoader } from './../../src/loader'
import { computed, useCurrentLanguage } from '#imports'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    load(langcodeOverride) {
      return $fetch('/api/load-texts', {
        query: {
          language: langcodeOverride || language.value,
        },
      }).then((v) => v || {})
    },
    reloadTrigger() {
      return computed(() => language.value)
    },
    currentLanguage() {
      return computed(() => language.value)
    },
  }
})

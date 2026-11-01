import { defineEasyTextsLoader } from '../../../src/loader'
import { $fetch, computed, useRoute } from '#imports'

export default defineEasyTextsLoader(() => {
  const route = useRoute()

  return {
    load(language) {
      return $fetch('/api/texts', { query: { language } })
    },
    currentLanguage() {
      return computed(() => (route.params.language === 'de' ? 'de' : 'en'))
    },
  }
})

import { defineEasyTextsLoader } from '#nuxt-easy-texts/types'

export default defineEasyTextsLoader(() => {
  return {
    load() {
      return Promise.resolve({})
    },
  }
})

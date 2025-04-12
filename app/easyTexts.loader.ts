import { defineEasyTextsLoader } from './../src/loader'

export default defineEasyTextsLoader(() => {
  return {
    load() {
      return Promise.resolve({})
    },
  }
})

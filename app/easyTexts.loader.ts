import { defineEasyTextsLoader } from './../src/runtime/loader'

export default defineEasyTextsLoader(() => {
  return {
    load() {
      return Promise.resolve({})
    },
  }
})

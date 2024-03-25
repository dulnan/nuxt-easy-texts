import { defineVuepalAdapter } from '#vuepal/types'

export default defineVuepalAdapter(() => {
  return {
    getTranslations() {
      return Promise.resolve({})
    },
    getStaticNodes() {
      return Promise.resolve([])
    },
    getAdminMenu() {
      return Promise.resolve(undefined)
    },
  }
})

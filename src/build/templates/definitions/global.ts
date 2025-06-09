import { defineStaticTemplate } from './../defineTemplate'

/**
 * Imports and exports the user's client options file.
 */
export default defineStaticTemplate(
  { path: 'nuxt-easy-texts/global' },
  () => {
    return 'export {}'
  },
  (helper) => {
    return `import type { EasyTextsFunctions, NuxtEasyTextsApp } from '${helper.paths.runtimeTypes}'

declare module 'vue' {
  interface ComponentCustomProperties extends EasyTextsFunctions { }
}

declare module '#app' {
  interface NuxtAppWithEasyTexts {
    $nuxtEasyTexts: NuxtEasyTextsApp
  }

  interface NuxtApp extends EasyTextsFunctions, NuxtAppWithEasyTexts { }
}
`
  },
)

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
    return `import type { EasyTextsFunctions, NuxtEasyTextsApp } from ${JSON.stringify(helper.paths.runtimeTypes)}

// Both blocks below are intentional and augment the same interface: 'vue'
// re-exports '@vue/runtime-core', so on a clean dependency tree either one on
// its own is enough.
//
// They are declared twice because module augmentation is keyed on the resolved
// module, not the specifier. Nuxt's generated tsconfig pins '@vue/runtime-core'
// in "paths" but, since Nuxt 4.5, no longer pins 'vue'. In an app with more
// than one copy of vue installed, the 'vue' block can therefore resolve to a
// different physical package than the one the compiled templates read
// ComponentCustomProperties from, and the augmentation silently vanishes.
// Declaring both means at least one always lands.

declare module 'vue' {
  interface ComponentCustomProperties extends EasyTextsFunctions { }
}

declare module '@vue/runtime-core' {
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

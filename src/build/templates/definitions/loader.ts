import { defineStaticTemplate } from './../defineTemplate'

/**
 * Imports and exports the user's client options file.
 */
export default defineStaticTemplate(
  { path: 'nuxt-easy-texts/loader' },
  (helper) => {
    const pathRelative = helper.toModuleBuildRelative(
      helper.paths.easyTextsLoader,
    )
    return `import easyTextsLoader from '${pathRelative}'
export { easyTextsLoader }
`
  },
  (helper) => {
    return `import type { EasyTextsLoader } from '${helper.paths.runtimeTypes}'

declare module '#nuxt-easy-texts/loader' {
  /**
   * The user provided easy texts loader.
   */
  export const easyTextsLoader: EasyTextsLoader
}
`
  },
)

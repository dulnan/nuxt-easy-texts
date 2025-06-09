import { defineStaticTemplate } from './../defineTemplate'

/**
 * Runtime settings.
 */
export default defineStaticTemplate(
  { path: 'nuxt-easy-texts/settings' },
  (helper) => {
    return `
export const advancedDebugEnabled = ${JSON.stringify(helper.options.experimental.advancedDebug)}
export const languageOverrideEnabled = ${JSON.stringify(helper.options.experimental.languageOverride)}
`
  },
  () => {
    return `
export const advancedDebugEnabled: boolean
export const languageOverrideEnabled: boolean
`
  },
)

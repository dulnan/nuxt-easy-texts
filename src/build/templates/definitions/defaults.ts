import { defineCollectorTemplate } from '../defineTemplate'

/**
 * The default texts from the code, keyed by full key, in the shape a loader
 * returns.
 *
 * The runtime only imports this when loading the texts fails, so the default
 * texts are in a separate chunk that is only loaded then. Texts without a
 * default text are left out, so they render as their key, as they would
 * without the fallback.
 */
export default defineCollectorTemplate(
  {
    path: 'nuxt-easy-texts/defaults',
    virtual: true,
  },
  (extractions) => {
    const texts = new Map<string, string | [string, string]>()
    for (const extraction of extractions) {
      if (extraction.type === 'plural') {
        texts.set(extraction.fullKey, [extraction.singular, extraction.plural])
      } else if (extraction.defaultText !== undefined) {
        texts.set(extraction.fullKey, extraction.defaultText)
      }
    }

    // JSON.parse instead of an object literal: in a literal, a "__proto__" key
    // would set the prototype instead of adding the text.
    const json = JSON.stringify(Object.fromEntries(texts))
    return `export default JSON.parse(${JSON.stringify(json)})`
  },
  () => `declare module '#nuxt-easy-texts/defaults' {
  /**
   * The default texts from the code, keyed by full key.
   */
  const defaults: Record<string, string | [string, string]>
  export default defaults
}
`,
)

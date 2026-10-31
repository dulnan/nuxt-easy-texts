import { defineCollectorTemplate } from '../defineTemplate'

export default defineCollectorTemplate(
  {
    path: 'nuxt-easy-texts/keys',
    virtual: true,
  },
  // Keys and texts come from string literals in the app's code and can contain
  // any character, so they are always embedded with JSON.stringify.
  (extractions) => {
    const keys = extractions.map((v) => JSON.stringify(v.fullKey)).join(',\n  ')
    return `
export const KEYS = [
  ${keys}
]
`
  },
  (extractions) => {
    const single = extractions.reduce<Record<string, string>>(
      (acc, extraction) => {
        if (extraction.type === 'text') {
          if (extraction.defaultText) {
            acc[extraction.fullKey] =
              `${JSON.stringify(extraction.fullKey)}: ${JSON.stringify(extraction.defaultText)}`
          }
        }
        return acc
      },
      {},
    )

    const plural = extractions.reduce<Record<string, string>>(
      (acc, extraction) => {
        if (extraction.type === 'plural') {
          if (extraction.singular) {
            acc[extraction.fullKey] =
              `${JSON.stringify(extraction.fullKey)}: [${JSON.stringify(extraction.singular)}, ${JSON.stringify(extraction.plural)}]`
          }
        }
        return acc
      },
      {},
    )

    return `
declare module '#nuxt-easy-texts/keys' {
  /**
   * The existing single text keys and their default texts.
   */
  export type EasyTextsSingle = {
  ${Object.values(single).sort().join(',\n   ')}
  }

  /**
   * The existing plural text keys and their default singular and plural texts.
   */
  export type EasyTextsPlural = {
  ${Object.values(plural).sort().join(',\n   ')}
  }

  /**
   * A valid single text key.
   */
  export type EasyTextSingleKey = keyof EasyTextsSingle

  /**
   * A valid plural text key.
   */
  export type EasyTextPluralKey = keyof EasyTextsPlural

  /**
   * Any valid single or plural text key.
   */
  export type EasyTextsKey = EasyTextSingleKey & EasyTextPluralKey

  /**
   * All text keys.
   */
  export const KEYS: EasyTextsKey[]
}
`
  },
)

import { defineCollectorTemplate } from '../defineTemplate'

export default defineCollectorTemplate(
  {
    path: 'nuxt-easy-texts/keys',
    virtual: true,
  },
  (extractions) => {
    const keys = extractions
      .map((v) => v.fullKey)
      .map((key) => {
        return `"${key}"`
      })
      .join(',\n  ')
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
              `"${extraction.fullKey}": ${JSON.stringify(extraction.defaultText)}`
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
              `"${extraction.fullKey}": [${JSON.stringify(extraction.singular)}, ${JSON.stringify(extraction.plural)}]`
          }
        }
        return acc
      },
      {},
    )

    return `
declare module '#nuxt-easy-texts/keys' {
  export type EasyTextsSingle = {
    ${Object.values(single).sort().join(',\n   ')}
  }

  export type EasyTextsPlural = {
    ${Object.values(plural).sort().join(',\n   ')}
  }

  export type EasyTextSingleKey = keyof EasyTextsSingle
  export type EasyTextPluralKey = keyof EasyTextsPlural

  export type EasyTextsKey = EasyTextSingleKey & EasyTextPluralKey

  export const KEYS: EasyTextsKey[]
}
`
  },
)

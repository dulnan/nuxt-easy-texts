import { defineCollectorTemplate } from '../defineTemplate'

export default defineCollectorTemplate(
  {
    path: 'nuxt-easy-texts/keys',
    virtual: true,
  },
  (extractions) => {
    const keys = [...extractions.values()]
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
    const unique = [...extractions.values()].reduce<Record<string, string>>(
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
    const keys = Object.values(unique).sort().join(',\n    ')
    return `
declare module '#nuxt-easy-texts/keys' {
  export type EasyTexts = {
    ${keys}
  }

  export type EasyTextsKey = keyof EasyTexts

  export const KEYS: EasyTextsKey[]
}
`
  },
)

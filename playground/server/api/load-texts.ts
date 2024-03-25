import { defineEventHandler, getQuery } from 'h3'
import texts from './../../texts.json'

const en = texts.reduce<Record<string, string | string[]>>(
  (acc, extraction) => {
    if (extraction.type === 'text') {
      acc[extraction.fullKey] = extraction.defaultText || extraction.fullKey
    } else {
      acc[extraction.fullKey] = [
        extraction.singular || extraction.fullKey,
        extraction.plural || extraction.fullKey,
      ]
    }

    return acc
  },
  {},
)

const translations: Record<string, Record<string, string | string[]>> = {
  en,
  de: {
    ...en,
    homepageTitle: 'Willkommen auf unserer Homepage!',
    siteName: 'nuxt-easy-texts Spielplatz',
  },
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const language = (query.language as string | undefined) || 'en'

  return translations[language]
})

import { defineNuxtPlugin, useState, watch } from '#imports'
import { easyTextsLoader } from '#nuxt-easy-texts/loader'

export default defineNuxtPlugin({
  name: 'nuxt-easy-texts',
  setup: async () => {
    const loader = easyTextsLoader()

    const isDebug = useState('nuxt_easy_texts_debug_enabled', () => false)

    const translations = useState<Record<string, string | string[]> | null>(
      'nuxt_easy_texts',
      () => {
        return null
      },
    )

    if (!translations.value) {
      translations.value = await loader.load()
    }

    const getSingleText = (key: string): string => {
      if (translations.value) {
        const candidate = translations.value[key]
        if (typeof candidate === 'string') {
          return candidate
        } else if (Array.isArray(candidate)) {
          return candidate[0] || key
        }
      }

      return key
    }

    const getPluralTexts = (key: string): [string, string] => {
      if (translations.value) {
        const candidate = translations.value[key]
        if (Array.isArray(candidate) && candidate.length === 2) {
          return [candidate[0]!, candidate[1]!]
        }
      }

      return [key, key]
    }

    if (import.meta.client) {
      async function reload() {
        translations.value = await loader.load()
      }
      if (loader.reloadTrigger) {
        const trigger = loader.reloadTrigger()
        watch(trigger, () => reload())
      }

      if (import.meta.hot) {
        import.meta.hot.on('nuxt-easy-texts:reload', () => reload())
      }
    }

    return {
      provide: {
        texts: (key: string, _defaultText?: string): string => {
          if (isDebug.value) {
            return key
          }
          return getSingleText(key)
        },
        textsPlural: (
          key: string,
          count: number,
          _singular?: string,
          _plural?: string,
        ): string => {
          if (isDebug.value) {
            return key
          }
          const [singular, plural] = getPluralTexts(key)
          return count === 1
            ? singular
            : plural.replace('@count', count.toString())
        },
      },
    }
  },
})

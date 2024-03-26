import { defineNuxtPlugin, useState, watch } from '#imports'
import getLoader from '#nuxt-easy-texts/loader'
import { type EasyTextsPluralFunction } from '#nuxt-easy-texts/types'
import { type ExistingTexts } from '#nuxt-easy-texts/generated-types'

export default defineNuxtPlugin({
  name: 'nuxt-easy-texts',
  setup: async () => {
    const loader = getLoader()

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
          return [candidate[0], candidate[1]]
        }
      }

      return [key, key]
    }

    if (process.client && loader.reloadTrigger) {
      const trigger = loader.reloadTrigger()
      watch(trigger, async () => {
        translations.value = await loader.load()
      })
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

declare module '#app' {
  interface NuxtApp {
    $texts: {
      <T extends keyof ExistingTexts>(
        key: T,
        defaultText: ExistingTexts[T],
      ): string
      (key: string, defaultText: string): string
    }
    $textsPlural: EasyTextsPluralFunction
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $texts: {
      <T extends keyof ExistingTexts>(
        key: T,
        defaultText: ExistingTexts[T],
      ): string
      (key: string, defaultText: string): string
    }
    $textsPlural: EasyTextsPluralFunction
  }
}

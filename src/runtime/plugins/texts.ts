import { defineNuxtPlugin, useState, watch } from '#imports'
import getLoader from '#nuxt-easy-texts/loader'
import { type ExistingTexts } from '#nuxt-easy-texts/generated-types'

export default defineNuxtPlugin({
  name: 'texts',
  setup: async () => {
    const loader = getLoader()

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        texts: (key: string, _defaultText?: string): string => {
          return getSingleText(key)
        },
        textsPlural: (
          key: string,
          count: number,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _singular?: string,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _plural?: string,
        ): string => {
          const [singular, plural] = getPluralTexts(key)
          return count === 1 ? singular : plural
        },
      },
    }
  },
})

/**
 * Declare an editable and translatable text key.
 *
 * @param {string} key
 * @param {string} defaultText
 */
type TextsFunctionTyped = <T extends keyof ExistingTexts>(
  key: T,
  defaultText: ExistingTexts[T],
) => string

/**
 * Declare an editable and translatable text key.
 *
 * @param {string} key
 * @param {string} defaultText
 */
type TextsFunctionGeneric = (key: string, defaultText: string) => string

/**
 * Declare an editable and translatable text key.
 *
 * @param {string} key
 * @param {string} defaultText
 */
type TextsFunction = TextsFunctionTyped | TextsFunctionGeneric

/**
 * Declare a plural text string.
 *
 * @param {string} key
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 */
type TextsPluralFunction = (
  key: string,
  count: number,
  singular: string,
  plural: string,
) => string

declare module '#app' {
  interface NuxtApp {
    $texts: TextsFunction
    $textsPlural: TextsPluralFunction
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $texts: TextsFunction
    $textsPlural: TextsPluralFunction
  }
}

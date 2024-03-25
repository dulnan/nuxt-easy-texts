import { defineNuxtPlugin, useState, watch, computed } from '#imports'
import getLoader from '#nuxt-easy-texts/loader'
import {
  type EasyTextsFunction,
  type EasyTextsPluralFunction,
} from '#nuxt-easy-texts/types'

export default defineNuxtPlugin({
  name: 'texts',
  setup: async () => {
    const loader = getLoader()

    const isDebug = useState('nuxt_easy_texts_debug_enabled', () => false)

    const isDebugActive = computed(() => {
      if (!loader.canDebug) {
        return
      }
      if (!loader.canDebug()) {
        return false
      }

      return isDebug.value
    })

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
          if (isDebugActive.value) {
            return key
          }
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
          if (isDebugActive.value) {
            return key
          }
          const [singular, plural] = getPluralTexts(key)
          return count === 1 ? singular : plural
        },
      },
    }
  },
})

declare module '#app' {
  interface NuxtApp {
    $texts: EasyTextsFunction
    $textsPlural: EasyTextsPluralFunction
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $texts: EasyTextsFunction
    $textsPlural: EasyTextsPluralFunction
  }
}

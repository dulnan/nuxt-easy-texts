import { defineNuxtPlugin, useState, watch } from '#imports'
import { easyTextsLoader } from '#nuxt-easy-texts/loader'
import { getPluralTexts, getSingleText } from '../helpers/textsFunctions'
import type { TextsState } from '../types'

export default defineNuxtPlugin<Record<string, unknown>>({
  name: 'nuxt-easy-texts',
  dependsOn: easyTextsLoader.options.dependsOn,
  setup: async () => {
    const loader = easyTextsLoader.getLoader()

    const isDebug = useState<boolean>(
      'nuxt_easy_texts_debug_enabled',
      () => false,
    )

    const translations = useState<TextsState | null>('nuxt_easy_texts', () => {
      return null
    })

    if (!translations.value) {
      translations.value = await loader.load()
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
          return getSingleText(key, isDebug.value, translations.value)
        },
        textsPlural: (
          key: string,
          count: number | null | undefined,
          _singular?: string,
          _plural?: string,
        ): string => {
          return getPluralTexts(key, count, isDebug.value, translations.value)
        },
      },
    }
  },
})

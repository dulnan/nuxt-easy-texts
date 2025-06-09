import { computed, defineNuxtPlugin, useState, watch } from '#imports'
import { easyTextsLoader } from '#nuxt-easy-texts/loader'
import { getPluralTexts, getSingleText } from '../helpers/textsFunctions'
import type { Replacements, TextsState } from '../types'

export default defineNuxtPlugin<Record<string, unknown>>({
  name: 'nuxt-easy-texts',
  dependsOn: easyTextsLoader.options.dependsOn,
  setup: async () => {
    const loader = easyTextsLoader.getLoader()

    const currentLanguage =
      'currentLanguage' in loader
        ? loader.currentLanguage()
        : loader.reloadTrigger
          ? loader.reloadTrigger()
          : computed(() => 'und')

    const isDebug = useState<boolean>(
      'nuxt_easy_texts_debug_enabled',
      () => false,
    )

    const translations = useState<Record<string, TextsState>>(
      'nuxt_easy_texts',
      () => {
        return {}
      },
    )

    if (!translations.value[currentLanguage.value]) {
      translations.value[currentLanguage.value] = await loader.load(
        currentLanguage.value,
      )
    }

    async function loadTranslationsForLanguage(
      language: string,
      force?: boolean,
    ): Promise<TextsState> {
      if (translations.value[language] && !force) {
        return translations.value[language]
      }

      const data = await loader.load(language)
      translations.value[language] = data
      return data
    }

    if (import.meta.client) {
      watch(currentLanguage, (newLanguage) => {
        loadTranslationsForLanguage(newLanguage)
      })
    }

    if (import.meta.hot) {
      import.meta.hot.on('nuxt-easy-texts:reload', () =>
        loadTranslationsForLanguage(currentLanguage.value, true),
      )
    }

    const currentTranslations = computed<TextsState>(() => {
      return translations.value[currentLanguage.value] || {}
    })
    // The method signature does not match the one of $texts because the
    // vite plugin removes the default text from the arguments.
    const $texts = (key: string, replacements?: Replacements): string => {
      return getSingleText(
        key,
        isDebug.value,
        currentTranslations.value,
        replacements,
      )
    }

    // The method signature does not match the one of $texts because the
    // vite plugin removes the default text from the arguments.
    const textsPlural = (
      key: string,
      count: number | null | undefined,
      replacements?: Replacements,
    ): string => {
      return getPluralTexts(
        key,
        count,
        isDebug.value,
        currentTranslations.value,
        replacements,
      )
    }

    return {
      provide: {
        nuxtEasyTexts: {
          loadTranslationsForLanguage,
          currentLanguage,
        },
        texts: $texts,
        textsPlural: textsPlural,
      },
    }
  },
})

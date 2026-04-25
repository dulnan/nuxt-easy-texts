import { computed, defineNuxtPlugin, useState, watch } from '#imports'
import { easyTextsLoader } from '#nuxt-easy-texts/loader'
import { DEBUG_ENABLED } from '../helpers/constants'
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

    const isDebug = useState<boolean>(DEBUG_ENABLED, () => false)

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
    // The vite plugin runs only on production builds, so the runtime receives
    // two different call shapes:
    //   - dev:  (key, defaultText?, replacements?) — args preserved as-is
    //   - prod: (key, replacements?)               — defaults stripped
    // We branch on import.meta.dev so each shape is handled cleanly. In the
    // dev branch we also forward the default text to the helper as a fallback,
    // which renders the default while a freshly-added (post-HMR) key hasn't
    // been picked up by the loader yet. The unused branch is tree-shaken in
    // production.
    const $texts = import.meta.dev
      ? (
          key: string,
          defaultText?: string,
          replacements?: Replacements,
        ): string => {
          return getSingleText(
            key,
            isDebug.value,
            currentTranslations.value,
            replacements,
            defaultText,
          )
        }
      : (key: string, replacements?: Replacements): string => {
          return getSingleText(
            key,
            isDebug.value,
            currentTranslations.value,
            replacements,
          )
        }

    const textsPlural = import.meta.dev
      ? (
          key: string,
          count: number | null | undefined,
          singular?: string,
          plural?: string,
          replacements?: Replacements,
        ): string => {
          return getPluralTexts(
            key,
            count,
            isDebug.value,
            currentTranslations.value,
            replacements,
            singular,
            plural,
          )
        }
      : (
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

import { computed, defineNuxtPlugin, useState, watch } from '#imports'
import { easyTextsLoader } from '#nuxt-easy-texts/loader'
import { DEBUG_ENABLED } from '../helpers/constants'
import { getPluralTexts, getSingleText } from '../helpers/textsFunctions'
import type {
  EasyTextsFunctions,
  NuxtEasyTextsApp,
  Replacements,
  TextsState,
} from '../types'

/**
 * The shape of what this plugin provides.
 *
 * This must be concrete: Nuxt maps every plugin's provide type through
 * `Decorate<T> = { [K in keyof T as `$${K}`]: T[K] }` and merges the result
 * into both `NuxtApp` and `ComponentCustomProperties`. A `Record<string,
 * unknown>` here would collapse into a `` `$${string}` `` index signature,
 * making every `$`-prefixed typo resolve to `unknown` app-wide.
 */
type EasyTextsProvide = {
  nuxtEasyTexts: NuxtEasyTextsApp
  texts: EasyTextsFunctions['$texts']
  textsPlural: EasyTextsFunctions['$textsPlural']
}

export default defineNuxtPlugin<EasyTextsProvide>({
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

    // The loaded translations, keyed by language. A Map rather than a plain
    // object, because the language can come from the URL: on a plain object,
    // names like "constructor" resolve to inherited values and assigning to
    // "__proto__" replaces the object's prototype. Nuxt's payload serializes
    // Maps. The state key differs from the one used when this was an object,
    // so a payload rendered by an older version is not read as a Map.
    const translations = useState<Map<string, TextsState>>(
      'nuxt_easy_texts_translations',
      () => new Map(),
    )

    /**
     * Loads the texts with the loader. If that fails, e.g. because the backend
     * is unavailable, uses the default texts from the code instead, so that
     * $texts keeps working, on the error page too.
     *
     * The default texts are only imported here, so they are in a separate
     * chunk that is only loaded when needed.
     */
    async function loadTexts(language: string): Promise<TextsState> {
      try {
        return await loader.load(language)
      } catch (error) {
        console.error(
          `[nuxt-easy-texts] Loading the texts for language "${language}" failed, using the default texts instead.`,
          error,
        )
        const { default: defaults } = await import('#nuxt-easy-texts/defaults')
        return defaults
      }
    }

    if (!translations.value.get(currentLanguage.value)) {
      translations.value.set(
        currentLanguage.value,
        await loadTexts(currentLanguage.value),
      )
    }

    async function loadTranslationsForLanguage(
      language: string,
      force?: boolean,
    ): Promise<TextsState> {
      const cached = translations.value.get(language)
      if (cached && !force) {
        return cached
      }

      const data = await loadTexts(language)
      translations.value.set(language, data)
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
      return translations.value.get(currentLanguage.value) || {}
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

    // The public $texts/$textsPlural types are overload sets keyed on the
    // generated key unions, while the implementations above are plain
    // (key: string, ...) functions whose arity differs between dev and prod.
    // The cast asserts the public contract at the provide boundary.
    return {
      provide: {
        nuxtEasyTexts: {
          loadTranslationsForLanguage,
          currentLanguage,
        },
        texts: $texts as EasyTextsFunctions['$texts'],
        textsPlural: textsPlural as EasyTextsFunctions['$textsPlural'],
      },
    }
  },
})

import type { ComputedRef } from '#imports'
import type {
  EasyTextSingleKey,
  EasyTextsSingle,
  EasyTextsPlural,
  EasyTextPluralKey,
} from '#nuxt-easy-texts/keys'
import type { NuxtAppLiterals } from 'nuxt/app'

export type TextsState = Record<string, string | string[]>

export type NuxtEasyTextsApp = {
  loadTranslationsForLanguage: (language: string) => Promise<TextsState>
  currentLanguage: ComputedRef<string>
}

export type EasyTextsLoaderCallback =
  | {
      /**
       * Load the correct texts for the current context.
       *
       * The returned value should be an object where each property is a full
       * translation key (from either $texts or $textsPlural).
       * The value should be a string (for $texts) or a an array of two strings (
       * for $textsPlural, where the first item is the singular text and the
       * second item is the plural text).
       */
      load: (language: string) => Promise<TextsState>

      /**
       * Return a computed property that is used to setup a watcher to trigger
       * reloading the texts.
       *
       * @deprecated Use currentLanguage() instead.
       */
      reloadTrigger?: () => ComputedRef<string>
    }
  | {
      /**
       * Load the correct texts for the current context.
       *
       * The returned value should be an object where each property is a full
       * translation key (from either $texts or $textsPlural).
       * The value should be a string (for $texts) or a an array of two strings (
       * for $textsPlural, where the first item is the singular text and the
       * second item is the plural text).
       */
      load: (language: string) => Promise<TextsState>

      /**
       * Return the current langcode.
       */
      currentLanguage: () => ComputedRef<string>
    }

export type EasyTextsLoaderOptions = {
  /**
   * Nuxt plugin dependencies that need to be executed before.
   */
  dependsOn?: NuxtAppLiterals['pluginName'][]
}

export type EasyTextsLoader = {
  getLoader: () => EasyTextsLoaderCallback
  options: EasyTextsLoaderOptions
}

export type Replacements = Record<string, string | number>

export interface EasyTextsFunctions {
  /**
   * Translate a single text.
   *
   * @param key - The translation key, optionally with a context prefix.
   * @param defaultText - The default text. Can be omitted if a default text already exists somewhere else.
   * @param replacements - An object defining a map of search => replace (e.g. { '@name': name }).
   *
   * @returns The text in the current language.
   */
  $texts: {
    (
      key: EasyTextSingleKey,
      defaultText?: string,
      replacements?: Replacements,
    ): string
    <T extends EasyTextSingleKey>(
      key: T,
      defaultText: EasyTextsSingle[T],
      replacements?: Replacements,
    ): string
    (key: string, defaultText: string, replacements?: Replacements): string
  }

  /**
   * Translate a plural text.
   *
   * @param key - The translation key, optionally with a context prefix.
   * @param count - The count.
   * @param singular - The default text for the singular case (e.g. "1 result").
   * @param plural - The default text for the plural case (e.g. "@count results").
   * @param replacements - An object defining a map of search => replace (e.g. { '@name': name }).
   *
   * @returns The matching singular or plural text in the current language.
   */
  $textsPlural: {
    (key: EasyTextPluralKey, count: string | number | null | undefined): string
    <T extends EasyTextPluralKey>(
      key: T,
      count: string | number | null | undefined,
      singular: EasyTextsPlural[T],
      plural: EasyTextsPlural[T],
      replacements?: Replacements,
    ): string
    (
      key: string,
      count: string | number | null | undefined,
      singular: string,
      plural: string,
      replacements?: Replacements,
    ): string
  }
}

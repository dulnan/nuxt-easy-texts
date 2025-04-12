import type { ComputedRef } from '#imports'
import type {
  EasyTextSingleKey,
  EasyTextsSingle,
  EasyTextsPlural,
  EasyTextPluralKey,
} from '#nuxt-easy-texts/keys'

export type EasyTextsLoader = {
  /**
   * Load the correct texts for the current context.
   *
   * The returned value should be an object where each property is a full
   * translation key (from either $texts or $textsPlural).
   * The value should be a string (for $texts) or a an array of two strings (
   * for $textsPlural, where the first item is the singular text and the
   * second item is the plural text).
   */
  load: () => Promise<Record<string, string | string[]>>

  /**
   * Return a computed property that is used to setup a watcher to trigger
   * reloading the texts.
   */
  reloadTrigger?: () => ComputedRef<string>
}

export interface EasyTextsFunctions {
  /**
   * Translate a single text.
   *
   * @param key - The translation key, optionally with a context prefix.
   * @param defaultText - The default text. Can be omitted if a default text already exists somewhere else.
   *
   * @returns The text in the current translation.
   */
  $texts: {
    (key: EasyTextSingleKey): string
    <T extends EasyTextSingleKey>(
      key: T,
      defaultText: EasyTextsSingle[T],
    ): string
    (key: string, defaultText: string): string
  }

  /**
   * Translate a plural text.
   *
   * @param key - The translation key, optionally with a context prefix.
   * @param count - The count.
   * @param singular - The default text for the singular case (e.g. "1 result").
   * @param plural - The default text for the plural case (e.g. "@count results").
   *
   * @returns The matching singular or plural text in the current language.
   */
  $textsPlural: {
    (key: EasyTextPluralKey, count: number | null | undefined): string
    <T extends EasyTextPluralKey>(
      key: T,
      count: number | null | undefined,
      singular: EasyTextsPlural[T],
      plural: EasyTextsPlural[T],
    ): string
    (
      key: string,
      count: number | null | undefined,
      singular: string,
      plural: string,
    ): string
  }
}

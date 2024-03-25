import { type ComputedRef } from '#imports'
import { type ExistingTexts } from '#nuxt-easy-texts/generated-types'

type EasyTextsLoader = {
  /**
   * Load the correct texts for the current context.
   */
  load: () => Promise<Record<string, string | string[]>>

  /**
   * Return a computed property that is used to setup a watcher to trigger reloading the texts.
   */
  reloadTrigger?: () => ComputedRef<string>

  /**
   * Determine whether the debug mode should be available for the current user.
   */
  canDebug?: () => boolean
}

/**
 * Define the texts loader.
 *
 * This method should load the correct texts as an object.
 */
export function defineEasyTextsLoader(
  cb: () => EasyTextsLoader,
): () => EasyTextsLoader {
  return cb
}

/**
 * Declare an editable and translatable text key.
 *
 * @param {string} key
 * @param {string} defaultText
 */
type EasyTextsFunctionTyped = <T extends keyof ExistingTexts>(
  key: T,
  defaultText: ExistingTexts[T],
) => string

/**
 * Declare an editable and translatable text key.
 *
 * @param {string} key
 * @param {string} defaultText
 */
type EasyTextsFunctionGeneric = (key: string, defaultText: string) => string

/**
 * Declare an editable and translatable text key.
 *
 * @param {string} key
 * @param {string} defaultText
 */
export type EasyTextsFunction =
  | EasyTextsFunctionTyped
  | EasyTextsFunctionGeneric

/**
 * Declare a plural text string.
 *
 * @param {string} key
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 */
export type EasyTextsPluralFunction = (
  key: string,
  count: number,
  singular: string,
  plural: string,
) => string

import { type ComputedRef } from '#imports'

type EasyTextsLoader = {
  /**
   * Load the correct texts for the current context.
   */
  load: () => Promise<Record<string, string | string[]>>

  /**
   * Return a computed property that is used to setup a watcher to trigger reloading the texts.
   */
  reloadTrigger?: () => ComputedRef<string>
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

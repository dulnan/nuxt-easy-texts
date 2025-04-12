import type { ComputedRef } from '#imports'

export type EasyTextsLoader = {
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

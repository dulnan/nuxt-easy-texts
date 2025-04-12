import type { EasyTextsGenerator } from './generator'

export type ModuleOptions = {
  /**
   * The pattern of source files to scan for translations.
   */
  pattern?: string[]

  /**
   * Define the generators.
   *
   * A generator is responsible for generating a runtime output file.
   * It could be a compiled GraphQL query, a JSON file or even JavaScript.
   */
  generators: EasyTextsGenerator[]

  /**
   * Define global texts.
   *
   * @example
   * {
   *   learnMore: 'Learn more',
   *   contact: 'Contact',
   *   next: 'Next',
   *   searchTitle: ['1 result', '@count results'],
   * }
   */
  globalTexts?: Record<string, string | [string, string]>

  /**
   * Enables debug logging during dev.
   */
  debug?: boolean
}

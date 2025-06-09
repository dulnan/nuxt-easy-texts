import type { EasyTextsGenerator } from './generator'

export interface ModuleOptions {
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

  /**
   * Experimental features.
   */
  experimental?: {
    /**
     * Enables advanced debugging.
     *
     * If enabled, you need to render the <EasyTextsDebugOverlay> component
     * when in debug mode. It will render an overlay that highlights rendered
     * text keys in the DOM. Each key can be clicked to select or unselect it.
     * The overlay can be submitted, which emits an "edit" event containing
     * all selected keys as payload.
     */
    advancedDebug?: boolean

    /**
     * Enables the "partial language override" feature.
     *
     * If enabled, you can use the <EasyTextsLanguageOverride> component to
     * override the language of parts of the page. It takes a prop called
     * "language" and enforces a specific language for the entire component
     * tree.
     *
     * Note that this *only* works when using the $texts and $textsPlural
     * methods returned by useEasyTexts()! The methods usually available
     * in Vue templates are injected *globally* and will therefore always
     * display texts in the current language.
     */
    languageOverride?: boolean
  }
}

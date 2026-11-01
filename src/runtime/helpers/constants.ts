import type { InjectionKey, Ref } from 'vue'
import type { TextsState } from '../types'

export const DEBUG_ENABLED = 'nuxt_easy_texts_debug_enabled'

/**
 * The state key of the loaded texts. `nuxt easy-texts merge` reads this state
 * from the payload of a rendered page.
 */
export const TRANSLATIONS_STATE = 'nuxt_easy_texts_translations'

/**
 * The provided texts overrides.
 */
export const INJECT_OVERRIDE = Symbol(
  'nuxt_easy_texts_override',
) as InjectionKey<Ref<TextsState | null>>

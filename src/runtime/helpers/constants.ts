import type { InjectionKey, Ref } from 'vue'
import type { TextsState } from '../types'

export const DEBUG_ENABLED = 'nuxt_easy_texts_debug_enabled'

/**
 * The state key of the loaded texts. `nuxt easy-texts merge` reads this state
 * from the payload of a rendered page.
 */
export const TRANSLATIONS_STATE = 'nuxt_easy_texts_translations'

/**
 * The state key of the languages that use the default texts, because loading
 * their texts failed. `nuxt easy-texts merge` refuses to merge them.
 */
export const FALLBACK_STATE = 'nuxt_easy_texts_fallback'

/**
 * The provided texts overrides.
 */
export const INJECT_OVERRIDE = Symbol(
  'nuxt_easy_texts_override',
) as InjectionKey<Ref<TextsState | null>>

import type { InjectionKey, Ref } from 'vue'
import type { TextsState } from '../types'

export const DEBUG_ENABLED = 'nuxt_easy_texts_debug_enabled'

/**
 * The provided texts overrides.
 */
export const INJECT_OVERRIDE = Symbol(
  'nuxt_easy_texts_override',
) as InjectionKey<Ref<TextsState | null>>

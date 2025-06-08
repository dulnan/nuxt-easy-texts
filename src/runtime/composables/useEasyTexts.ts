import {
  computed,
  useNuxtApp,
  useState,
  inject,
  type ComputedRef,
  type Ref,
} from '#imports'
import { getPluralTexts, getSingleText } from '../helpers/textsFunctions'
import type { EasyTextsFunctions, Replacements, TextsState } from './../types'

interface UseEasyTexts extends EasyTextsFunctions {
  /**
   * Whether debug mode is enabled.
   */
  isDebug: ComputedRef<boolean>

  /**
   * Toggle debug mode.
   */
  toggleDebug: () => void

  /**
   * Enable debug mode.
   */
  enableDebug: () => void

  /**
   * Disable debug mode.
   */
  disableDebug: () => void
}

/**
 * Use the nuxt-easy-texts helper.
 */
export function useEasyTexts(): UseEasyTexts {
  // Provided by <EasyTextsLanguageOverride>.
  const override = inject<Ref<TextsState | null> | null>(
    'nuxt_easy_texts_override',
    null,
  )

  const isDebugState = useState<boolean>(
    'nuxt_easy_texts_debug_enabled',
    () => false,
  )

  const isDebug = computed<boolean>(() => isDebugState.value)

  const app = useNuxtApp()

  // If an override is set, return a method that uses the overrides instead.
  const textsFunction = override
    ? function (key: string, replacements?: Replacements) {
        return getSingleText(key, isDebug.value, override.value, replacements)
      }
    : app.$texts

  const textsPluralFunction = override
    ? function (
        key: string,
        count: string | number | undefined | null,
        replacements?: Replacements,
      ) {
        return getPluralTexts(
          key,
          count,
          isDebug.value,
          override.value,
          replacements,
        )
      }
    : app.$textsPlural

  function enableDebug(): void {
    isDebugState.value = true
  }

  function disableDebug(): void {
    isDebugState.value = false
  }

  function toggleDebug(): void {
    isDebugState.value = !isDebugState.value
  }

  return {
    $texts: textsFunction as EasyTextsFunctions['$texts'],
    $textsPlural: textsPluralFunction as EasyTextsFunctions['$textsPlural'],
    isDebug,
    enableDebug,
    disableDebug,
    toggleDebug,
  }
}

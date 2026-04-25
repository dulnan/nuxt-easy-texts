import {
  computed,
  useNuxtApp,
  useState,
  inject,
  type ComputedRef,
} from '#imports'
import { DEBUG_ENABLED, INJECT_OVERRIDE } from '../helpers/constants'
import { getPluralTexts, getSingleText } from '../helpers/textsFunctions'
import type { EasyTextsFunctions, Replacements } from './../types'

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
  const override = inject(INJECT_OVERRIDE, null)

  const isDebugState = useState<boolean>(DEBUG_ENABLED, () => false)

  const isDebug = computed<boolean>(() => isDebugState.value)

  const app = useNuxtApp()

  // If an override is set, return a method that uses the overrides instead.
  // See the plugin in src/runtime/plugins/texts.ts for the rationale behind
  // the import.meta.dev branching: the vite plugin only transforms calls in
  // production, so dev-mode calls retain their default-text args (which we
  // also forward as a fallback for unloaded translations).
  const textsFunction = override
    ? import.meta.dev
      ? function (
          key: string,
          defaultText?: string,
          replacements?: Replacements,
        ) {
          return getSingleText(
            key,
            isDebug.value,
            override.value,
            replacements,
            defaultText,
          )
        }
      : function (key: string, replacements?: Replacements) {
          return getSingleText(key, isDebug.value, override.value, replacements)
        }
    : app.$texts

  const textsPluralFunction = override
    ? import.meta.dev
      ? function (
          key: string,
          count: string | number | undefined | null,
          singular?: string,
          plural?: string,
          replacements?: Replacements,
        ) {
          return getPluralTexts(
            key,
            count,
            isDebug.value,
            override.value,
            replacements,
            singular,
            plural,
          )
        }
      : function (
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

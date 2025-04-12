import { computed, useNuxtApp, useState, type ComputedRef } from '#imports'
import type { EasyTextsFunctions } from './../types'

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
  const { $texts, $textsPlural } = useNuxtApp()
  const isDebugState = useState('nuxt_easy_texts_debug_enabled', () => false)

  const isDebug = computed(() => isDebugState.value)

  function enableDebug() {
    isDebugState.value = true
  }

  function disableDebug() {
    isDebugState.value = false
  }

  function toggleDebug() {
    isDebugState.value = !isDebugState.value
  }

  return {
    $texts,
    $textsPlural,
    isDebug,
    enableDebug,
    disableDebug,
    toggleDebug,
  }
}

import { computed, useNuxtApp, useState, type ComputedRef } from '#imports'

import type {
  EasyTextsFunction,
  EasyTextsPluralFunction,
} from '#nuxt-easy-texts/types'

type UseEasyTexts = {
  $texts: EasyTextsFunction
  $textsPlural: EasyTextsPluralFunction
  isDebug: ComputedRef<boolean>
  toggleDebug: () => void
  enableDebug: () => void
  disableDebug: () => void
}

export function useEasyTexts(): UseEasyTexts {
  const { $texts, $textsPlural } = useNuxtApp()
  const isDebugState = useState('nuxt_easy_texts_debug_enabled', () => false)

  const isDebug = computed(() => isDebugState.value)

  const enableDebug = () => (isDebugState.value = true)
  const disableDebug = () => (isDebugState.value = false)
  const toggleDebug = () => (isDebugState.value = !isDebugState.value)

  return {
    $texts,
    $textsPlural,
    isDebug,
    enableDebug,
    disableDebug,
    toggleDebug,
  }
}

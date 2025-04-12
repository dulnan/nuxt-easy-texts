import { computed, useNuxtApp, useState, type ComputedRef } from '#imports'
import type { EasyTexts, EasyTextsKey } from '#nuxt-easy-texts/keys'
import type { EasyTextsPluralFunction } from './../types'

type UseEasyTexts = {
  $texts: {
    <T extends EasyTextsKey>(key: T, defaultText: EasyTexts[T]): string
    (key: string, defaultText: string): string
  }
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

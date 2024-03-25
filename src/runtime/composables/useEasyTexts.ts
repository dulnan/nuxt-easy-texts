import { computed, useNuxtApp, useState, type ComputedRef } from '#imports'
import { type ExistingTexts } from '#nuxt-easy-texts/generated-types'
import type { EasyTextsPluralFunction } from '#nuxt-easy-texts/types'

type UseEasyTexts = {
  $texts: {
    <T extends keyof ExistingTexts>(
      key: T,
      defaultText: ExistingTexts[T],
    ): string
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

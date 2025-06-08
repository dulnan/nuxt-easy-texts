<template>
  <Component :is="tag" :lang="langAttribute">
    <slot />
  </Component>
</template>

<script lang="ts" setup>
import { provide, computed, useAsyncData } from '#imports'
import { easyTextsLoader } from '#nuxt-easy-texts/loader'
import type { TextsState } from '../types'

const props = withDefaults(
  defineProps<{
    language: string
    tag?: string
  }>(),
  {
    tag: 'div',
  },
)

const loader = easyTextsLoader.getLoader()

if (!loader.currentLanguage) {
  throw new Error(
    'The currentLanguage() method must be implemented in easyTexts.loader.ts when using the <EasyTextsLanguageOverride> component.',
  )
}

const currentLanguage = loader.currentLanguage()

const asyncKey = computed(() => 'nuxt-easy-texts:override:' + props.language)

const { data, refresh } = await useAsyncData<TextsState>(
  asyncKey.value,
  () => loader.load(props.language),
  {
    watch: [asyncKey],
  },
)

if (import.meta.hot) {
  import.meta.hot.on('nuxt-easy-texts:reload', () => refresh())
}

const langAttribute = computed(() => {
  if (currentLanguage.value !== props.language) {
    return props.language
  }

  return undefined
})

provide('nuxt_easy_texts_override', data)
</script>

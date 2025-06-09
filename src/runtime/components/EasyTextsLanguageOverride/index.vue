<template>
  <Component :is="tag" :lang="langAttribute">
    <slot />
  </Component>
</template>

<script lang="ts" setup>
import { provide, computed, useNuxtApp, ref, watch } from '#imports'

const props = withDefaults(
  defineProps<{
    language: string
    tag?: string
  }>(),
  {
    tag: 'div',
  },
)

const { $nuxtEasyTexts } = useNuxtApp()

const overrideLanguage = computed(() => props.language)

const translations = ref(
  await $nuxtEasyTexts.loadTranslationsForLanguage(overrideLanguage.value),
)

async function reloadTranslations(language: string) {
  translations.value =
    await $nuxtEasyTexts.loadTranslationsForLanguage(language)
}

watch(overrideLanguage, reloadTranslations)

if (import.meta.hot) {
  import.meta.hot.on('nuxt-easy-texts:reload', () =>
    reloadTranslations(overrideLanguage.value),
  )
}

const langAttribute = computed(() => {
  if ($nuxtEasyTexts.currentLanguage.value !== props.language) {
    return props.language
  }

  return undefined
})

provide('nuxt_easy_texts_override', translations)
</script>

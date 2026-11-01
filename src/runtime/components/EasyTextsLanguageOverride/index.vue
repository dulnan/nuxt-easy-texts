<template>
  <Component :is="tag" :lang="langAttribute">
    <slot />
  </Component>
</template>

<script lang="ts" setup>
import { provide, computed, useNuxtApp, ref, watch } from '#imports'
import { INJECT_OVERRIDE } from '../../helpers/constants'

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
  const result = await $nuxtEasyTexts.loadTranslationsForLanguage(language)

  // The language may have changed again while loading. Without this check,
  // a slow response for an earlier language would replace the texts of the
  // current one.
  if (language === overrideLanguage.value) {
    translations.value = result
  }
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

provide(INJECT_OVERRIDE, translations)
</script>

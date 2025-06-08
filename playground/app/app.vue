<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div>
      <button @click="onClick">Force language: {{ forceLanguage }}</button>
    </div>
    <EasyTextsLanguageOverride :language="forceLanguage">
      <TestOverride />
    </EasyTextsLanguageOverride>
  </div>
</template>

<script lang="ts" setup>
import { ref, useCurrentLanguage } from '#imports'

const language = useCurrentLanguage()
const forceLanguage = ref(language.value)

function onClick() {
  forceLanguage.value = forceLanguage.value === 'de' ? 'en' : 'de'
}
</script>

<style lang="css">
body {
  font-family: sans-serif;
}
</style>

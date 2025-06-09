<template>
  <div class="app">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div>
      <button @click="onClick">Force language: {{ forceLanguage }}</button>
    </div>
    <EasyTextsLanguageOverride :language="forceLanguage">
      <TestOverride :language="forceLanguage" />
    </EasyTextsLanguageOverride>
  </div>
</template>

<script lang="ts" setup>
import { ref } from '#imports'

const forceLanguage = ref('de')

function onClick() {
  forceLanguage.value = forceLanguage.value === 'de' ? 'en' : 'de'
}
</script>

<style lang="css">
body {
  font-family: sans-serif;
  background: #eee;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  margin-top: 2rem;
}
</style>

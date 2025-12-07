<template>
  <span>{{ $texts('debug.test', 'Default debug text') }}</span>
</template>

<script setup lang="ts">
import { useEasyTexts } from '#imports'

// This useEasyTexts() call happens inside the slot, so it will
// receive the injected override from EasyTextsLanguageOverride
const { $texts } = useEasyTexts()
</script>

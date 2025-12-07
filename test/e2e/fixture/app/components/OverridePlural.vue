<template>
  <span>{{ $textsPlural('plural.key', 3, 'One item', '@count items') }}</span>
</template>

<script setup lang="ts">
import { useEasyTexts } from '#imports'

// This useEasyTexts() call happens inside the slot, so it will
// receive the injected override from EasyTextsLanguageOverride
const { $textsPlural } = useEasyTexts()
</script>

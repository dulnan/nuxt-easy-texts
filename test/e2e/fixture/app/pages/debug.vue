<template>
  <div>
    <h1>Debug Mode Tests</h1>

    <!-- Debug state indicator -->
    <p data-testid="debug-state">
      Debug: {{ isDebug ? 'enabled' : 'disabled' }}
    </p>

    <!-- Control buttons -->
    <button data-testid="btn-enable" @click="enableDebug">Enable Debug</button>
    <button data-testid="btn-disable" @click="disableDebug">
      Disable Debug
    </button>
    <button data-testid="btn-toggle" @click="toggleDebug">Toggle Debug</button>

    <!-- Test text that changes based on debug mode -->
    <p data-testid="debug-text">
      {{ $texts('debug.test', 'Default debug text') }}
    </p>

    <!-- Plural text for debug mode testing -->
    <p data-testid="debug-plural">
      {{ $textsPlural('plural.key', 5, 'One item', '@count items') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useEasyTexts } from '#imports'

const {
  $texts,
  $textsPlural,
  isDebug,
  enableDebug,
  disableDebug,
  toggleDebug,
} = useEasyTexts()
</script>

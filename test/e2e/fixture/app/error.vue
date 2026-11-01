<template>
  <div>
    <h1 data-testid="error-title">
      {{ $texts('error.title', 'Something went wrong') }}
    </h1>
    <p data-testid="error-status">{{ error.statusCode }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ error: { statusCode: number } }>()
</script>

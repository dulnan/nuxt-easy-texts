<template>
  <div>
    <h1>{{ $texts('homepageTitle', 'Welcome to our homepage!') }}</h1>

    <section>
      <button @click="count--">
        {{ $texts('buttonDecrement', 'Remove 1') }}
      </button>
      <button @click="count++">
        {{ $texts('buttonIncrement', 'Add 1') }}
      </button>
      <h3>{{ text }}</h3>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useNuxtApp } from '#imports'

const { $texts, $textsPlural } = useNuxtApp()

const count = ref(0)

const text = computed(() => {
  if (count.value === 0) {
    return $texts('counterZero', 'No items.')
  }
  return $textsPlural(
    'counterText',
    count.value,
    '1 item',
    '@count items',
  ).replace('@count', count.value.toString())
})
</script>

<template>
  <div style="padding-top: 100px; padding-left: 40px">
    <nav>
      <div>{{ siteName }}</div>
      <div>
        <button @click="toggleDebug">
          {{ $texts('toggleDebugMode', 'Toggle debug mode') }}
        </button>
      </div>
      <ul>
        <li>
          <NuxtLink to="/en">{{
            $texts('language.english', 'English')
          }}</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/de">{{
            $texts('language.german', 'German')
          }}</NuxtLink>
        </li>
      </ul>
    </nav>
    <div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useEasyTexts } from '#imports'

const { $texts, toggleDebug } = useEasyTexts()

const siteName = computed(() =>
  $texts('siteName', 'nuxt-easy-texts Playground'),
)
</script>

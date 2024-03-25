<template>
  <div style="padding-top: 200px">
    <nav>
      <div>{{ siteName }}</div>
      <div><button @click="toggleDebug">Toggle debug mode</button></div>
      <ul>
        <li>
          <NuxtLink to="/en">English</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/de">German</NuxtLink>
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

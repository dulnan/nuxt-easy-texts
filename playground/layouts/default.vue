<template>
  <div style="padding-top: 200px">
    <nav>
      {{ siteName }}
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
import { useCurrentLanguage, useNuxtApp, computed } from '#imports'

const { $texts } = useNuxtApp()
const language = useCurrentLanguage()

const siteName = computed(() =>
  $texts('siteName', 'nuxt-easy-texts Playground'),
)
</script>

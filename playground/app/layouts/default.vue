<template>
  <div>
    <EasyTextsDebugOverlay v-if="isDebug" @edit="onEdit" />

    <nav>
      <div>{{ siteName }}</div>
      <div>
        <div>
          <strong>Should contain a random number on HMR</strong>
        </div>
        <div>{{ $texts('debugHmr', 'Foobar') }}</div>
      </div>
      <div>
        <button @click="toggleDebug">Toggle Debug Mode</button>
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
import { useEasyTexts, useSiteContext } from '#imports'

const { toggleDebug, $texts, isDebug } = useEasyTexts()

const { siteName } = useSiteContext()

function onEdit(keys: string[]) {
  console.log({ keys })
}
</script>

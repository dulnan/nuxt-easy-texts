<template>
  <div>
    <h2>Test EasyTextsLanguageOverride</h2>
    <p>{{ $texts('alwaysGerman', 'Always German') }}</p>
    <table>
      <tbody>
        <tr v-for="key in keys" :key>
          <td>{{ key }}</td>
          <td class="override">{{ getTexts(key) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { useEasyTexts } from '#imports'
import type { EasyTextSingleKey } from '#nuxt-easy-texts/keys'

const keys: EasyTextSingleKey[] = [
  'toggleDebugMode',
  'buttonDecrement',
  'buttonIncrement',
  'textWithQuotes',
  'homepageTitle',
  'learnMore',
]

const { $texts: getTexts } = useEasyTexts()
const { $texts } = useEasyTexts()
</script>

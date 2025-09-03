<template>
  <div>
    <h2>Test EasyTextsLanguageOverride</h2>
    <p>
      {{
        $texts('languageOverrideLabel', 'Always @language', {
          '@language': languageLabel,
        })
      }}
    </p>
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
import { useEasyTexts, computed } from '#imports'
import type { EasyTextSingleKey } from '#nuxt-easy-texts/keys'

const props = defineProps<{
  language: string
}>()

const languageLabel = computed(() =>
  props.language === 'de' ? 'Deutsch' : 'English',
)

const keys: EasyTextSingleKey[] = [
  'buttonDecrement',
  'buttonIncrement',
  'textWithQuotes',
  'homepageTitle',
  'learnMore',
]

const { $texts: getTexts } = useEasyTexts()
const { $texts } = useEasyTexts()
</script>

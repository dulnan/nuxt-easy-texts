# nuxt-easy-texts - key-based texts/translations extractor and loader for Nuxt 3.

## Features

- Define translatable texts using keys and optional default values
- Load texts and translations at runtime
- Support for plural text strings
- Customize how text extractions are generated (JSON, PO file, GraphQL, ...)
- Debug mode that renders the keys

```vue
<template>
  <div>{{ $texts('homeTitle', 'Welcome!') }}</div>
</template>
```

## Setup

### Install module

```
npm install --save nuxt-easy-texts
```

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-easy-texts'],

  easyTexts: {
    generators: [
      {
        outputPath: './texts.json',
        generate: 'json',
      },
    ],
  },
})
```

### Configure loader

All texts are loaded at runtime. How and where the texts are loaded is up to
you. To define a loader, create the following file in
`~/app/easyTexts.loader.ts`:

```typescript
import { defineEasyTextsLoader } from '#nuxt-easy-texts/types'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    load(): Promise<Record<string, string | [string, string]>> {
      // Load the texts in the current language from an API route.
      // Method should return an object whose properties are the full keys and
      // the values are either a string (for $texts keys) or an array of
      // exactly two strings (for $textsPlural keys).
      return $fetch('/api/load-texts', {
        query: {
          language: language.value,
        },
      })
    },
  }
})
```

### Use texts

The module provides two properties on the Nuxt and Vue instance: `$texts` and
`$textsPlural`. You can directly use them in your Vue components (and they are
reactive!):

```vue
<template>
  <div>
    <div>{{ $texts('homeTitle', 'Welcome!') }}</div>
    <div>
      {{ $textsPlural('counter', counter, 'One item', '@count items') }}
    </div>
  </div>
</template>

<script lang="ts" setup>
const counter = ref(1)
</script>
```

Alternatively, you can also use them from the `useEasyTexts()` composable:

```typescript
const { $texts, $textsPlural } = useEasyTexts()

// Must be wrapped in computed() to remain reactive.
const text = computed(() => $texts('backToTop', 'Back to top'))
```

## How it works

nuxt-easy-texts searches your Vue components for all calls to the `$texts` and
`$textsPlural` methods.

### Output files

You can completely customize the generated output file (or generate mutliple
files):

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-easy-texts'],

  easyTexts: {
    generators: [
      // Generates a JSON file of all raw extractions.
      {
        outputPath: './texts.json',
        generate: 'json',
      },

      // Provide a custom method to generate the output file.
      {
        outputPath: './texts.txt',
        generate: (extractions) => {
          // Generates a simple text file with one extraction per line.
          return extractions
            .map((v) => {
              // Handle single texts.
              if (v.type === 'text') {
                return `${v.fullKey}: ${v.defaultText}`
              }

              // Handle plural texts.
              return `${v.fullKey}: ${v.singular} | ${v.plural}`
            })
            .join('\n')
        },
      },
    ],
  },
})
```

### Load the texts

All default/singular/plural texts in your code are compiled away, for example:

```typescript
const { $texts, $textsPlural } = useEasyTexts()

const title = $texts('footerCopyright', '© 2024 ACME')

const counter = ref(1)
const countText = $texts('countText', counter.value, 'One item', '@count items')
```

This is compiled to:

```typescript
const { $texts, $textsPlural } = useEasyTexts()

const title = $texts('footerCopyright')

const counter = ref(1)
const countText = $textsPlural('countText', counter.value)
```

nuxt-easy-texts assumes that every text string is loaded at runtime.

## Debug Mode

This is helpful if you want to offer content editors a way to easily find which
text key is being shown.

```typescript
const { $texts, toggleDebug } = useEasyTexts()

const goBackText = computed(() => $texts('goBack', 'Go back to homepage'))

// Logs 'Go back to homepage'
console.log(goBackText.value)

toggleDebug()

// Logs 'goBack'
console.log(goBackText.value)
```

## Changing languages (reloading texts)

If the language changes you may want to reload all texts. To do that, implement
a `reloadTrigger` method in your loader. The method should return a computed
property. The nuxt-easy-texts adds a watcher to this property on the client side
and will reload the texts by calling `load()` again on your loader when the
value changes.

```typescript
import { defineEasyTextsLoader } from '#nuxt-easy-texts/types'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    reloadTrigger() {
      return computed(() => language.value)
    },
  }
})
```

## Configuration reference

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-easy-texts'],

  easyTexts: {
    // Define which files to include.
    pattern: [
      './components/**/*.{js,ts,vue}',
      './layouts/**/*.{js,ts,vue}',
      './layers/**/*.{js,ts,vue}',
      './pages/**/*.{js,ts,vue}',
      './composables/**/*.{js,ts,vue}',
    ],

    // Define what and where to generate extractions.
    generators: [
      {
        outputPath: './texts.json',
        generate: 'json',
      },
    ],

    // Provide text keys and default values at build time.
    // Useful if you have keys that can't be extracted for some reason.
    globalTexts: { learnMore: 'Learn more' },
  },
})
```

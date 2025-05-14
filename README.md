# nuxt-easy-texts - key-based texts/translations for Nuxt 3

- Define translatable texts using keys and default texts
- Load and override texts and translations at runtime
- Support for plural text strings
- Customize how text extractions are generated (JSON, PO file, GraphQL, ...)
- Debug mode to render the key instead of the text

### Why not...?

This module was created to specifically solve a single problem: Having an easy
way to collect translatable texts _and_ load their translations at runtime (for
example from an API endpoint). The compiled build will only contain the keys and
no more texts. They always have to be provided at runtime.

It is not meant as a full replacement for something like
[vue-i18n](https://vue-i18n.intlify.dev) or
[nuxt/i18n](https://i18n.nuxtjs.org), which offer way more features such as
language based routing, SEO, etc.

If the only thing you want to do is collect texts in your code and load them at
runtime, this module is for you!

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

### Configure loader

All texts are loaded at runtime. How and where the texts are loaded is up to
you. To define a loader, create the following file in
`~/app/easyTexts.loader.ts`:

```typescript
import { defineEasyTextsLoader } from 'nuxt-easy-texts/loader'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    load(): Promise<Record<string, string | [string, string]>> {
      // Load the texts in the current language from an API route.
      // Method should return an object whose properties are the full keys and
      // the values are either a string (for $texts keys) or an array of
      // exactly two strings (for $textsPlural keys).
      //
      // For our two examples above, the loader should return the following:
      // {
      //   homeTitle: 'Welcome!',
      //   counter: ['One item', '@count items'],
      // }
      return $fetch('/api/load-texts', {
        query: {
          language: language.value,
        },
      })
    },
    reloadTrigger() {
      // Will call load() again whenever the language changes.
      return computed(() => language.value)
    },
    // If your load() method depends on another Nuxt plugin to run before,
    // you can define its name here.
    dependsOn: ['name-of-another-plugin'],
  }
})
```

nuxt-easy-texts will call this method inside its plugin, right before it injects
`$texts` and `$textsPlural`. Make sure that anything that requires these two
methods is loaded **after** this plugin is initialized.

## How it works

nuxt-easy-texts searches your Vue components and JS/TS files for all calls to
the `$texts` and `$textsPlural` methods. Because of that, there are a few things
that won't work:

- Rename methods: The name of the method must be exactly `$texts` or
  `$textsPlural` - you can't rename them (e.g.
  `const { $texts: getText } = useEasyTexts()` will not work)
- Use variables: You can only use string literals inside both methods. Something
  like `{{ $texts('language_' + language) }}` will not work

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

#### Generate a GraphQL fragment for the drupal/texts module

If you use the [drupal/texts](https://www.drupal.org/project/texts) module, you
can use the builtin `drupal-graphql-texts` generate option. It will generate a
fragment file that can be used to load the translations in a GraphQL query.

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-easy-texts'],

  easyTexts: {
    generators: [
      {
        outputPath: './fragment.easyTexts.graphql',
        generate: 'drupal-graphql-texts',
      },
    ],
  },
})
```

The resulting file will look like this:

```graphql
fragment easyTexts on TextsLoader {
  homeTitle: getText(key: "homeTitle", default: "Welcome!")
  counter: getTextPlural(
    key: "counter"
    singular: "One item"
    plural: "@count items"
  ) {
    singular
    plural
  }
}
```

### Load the texts

All default/singular/plural texts in your code are removed via a vite plugin,
for example:

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

nuxt-easy-texts requires that every text string is loaded at runtime. The
default texts are not available at runtime in any way. You could however
generate a JSON file with a custom `generate` method and then return said JSON
file in your loaders `load()` method.

### Text keys and contexts

Providing context is also possible. You can do that by prefixing the key with a
string followed by a dot:

```vue
<template>
  <div>{{ $texts('cart.addButton', 'Add to cart') }}</div>
</template>
```

This will generate the following extraction:

```json
{
  "fullKey": "cart.addButton",
  "key": "addButton",
  "context": "cart",
  "defaultText": "Add to cart",
  "type": "text",
  "filePath": "/var/www/example/components/AddToCart.vue"
}
```

## Debug Mode

This is helpful if you want to offer content editors in a CMS a way to easily
find which text key is currently being shown.

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

If the language or any context (like country) changes you may want to reload all
texts. To do that, implement a `reloadTrigger` method in your loader. The method
should return a computed property. nuxt-easy-texts adds a watcher to this
property on the client side and will reload the texts by calling `load()` again
on your loader when the value changes.

```typescript
import { defineEasyTextsLoader } from 'nuxt-easy-texts/loader'

export default defineEasyTextsLoader(() => {
  const language = useCurrentLanguage()

  return {
    reloadTrigger() {
      return computed(() => language.value)
    },
  }
})
```

**NOTE:** The watcher is only added client-side, not during SSR! The
`loader.load()` method is called exactly once during SSR and it must return the
correct translations.

Because the loaded texts are stored using `useState()` they are part of the
payload. So during hydration, the `loader.load()` method is not called.

## Reference

### Configuration reference

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
    globalTexts: {
      learnMore: 'Learn more',
      resultsTitle: ['1 result', '@count results'],
    },
  },
})
```

### useEasyTexts() composable

```typescript
const {
  $texts,
  $textsPlural,
  isDebug,
  enableDebug,
  disableDebug,
  toggleDebug,
} = useEasyTexts()
```

#### $texts

Use a single text string

```typescript
$texts('backToHome', 'Back to homepage')
```

#### $textsPlural

Use text string with a singular and plural option.

```typescript
const cartCount = ref(2)
$textsPlural('cartItems', cartCount.value, '1 items', '@count items')
```

#### isDebug: ComputeRef<boolean>

Check if debug mode is enabled.

#### enabledDebug: () => void

Enable debug mode.

#### disableDebug: () => void

Disable debug mode.

#### toggleDebug: () => void

Toggle debug mode.

# nuxt-easy-texts - key-based texts/translations for Nuxt

- Define translatable texts using keys and default texts
- Load and override texts and translations at runtime
- Support for plural text strings
- Customize how text extractions are generated (JSON, PO file, GraphQL, ...)
- Debug mode to render the key instead of the text

### Why not...?

This module was created to specifically solve a single problem: Having an easy
way to collect translatable texts _and_ load their translations at runtime (for
example from an API endpoint). The compiled code only contains the keys, and the
texts are provided at runtime. The default texts are only used as a fallback,
when loading the texts fails.

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

To insert dynamic values, use placeholders in the text and pass their values as
replacements, the third argument of `$texts` and the fifth of `$textsPlural`:

```typescript
$texts('greeting', 'Hello @name!', { '@name': user.name })

$textsPlural('cartItemsIn', count, '1 item in @cart', '@count items in @cart', {
  '@cart': cart.name,
})
```

`$textsPlural` replaces `@count` with the count by itself.

### Configure loader

All texts are loaded at runtime. How and where the texts are loaded is up to
you. To define a loader, create the file `easyTexts.loader.ts` in your app
directory (`app/` by default, see
[`dir.app`](https://nuxt.com/docs/4.x/api/nuxt-config#dir)), so
`app/easyTexts.loader.ts`:

```typescript
import { defineEasyTextsLoader } from 'nuxt-easy-texts/loader'

export default defineEasyTextsLoader(() => {
  // The current language of your app, e.g. from the route.
  const appLanguage = useCurrentLanguage()

  return {
    load(language) {
      // Load the texts in the given language from an API route.
      // Method should return an object whose properties are the full keys and
      // the values are either a string (for $texts keys) or an array of
      // exactly two strings (for $textsPlural keys).
      //
      // For the homeTitle and counter examples above, the loader should
      // return the following:
      // {
      //   homeTitle: 'Welcome!',
      //   counter: ['One item', '@count items'],
      // }
      return $fetch('/api/load-texts', {
        query: {
          language,
        },
      })
    },
    currentLanguage() {
      // The language the page is rendered in. Its texts are loaded with
      // load(), and loaded again whenever it changes.
      return computed(() => appLanguage.value)
    },
  }
})
```

`load()` receives the language to load. That is usually the current language,
but [`<EasyTextsLanguageOverride>`](#partial-language-override) passes its own,
so always load the language that `load()` receives. If your app has only one
language, you can leave out `currentLanguage()`, and `load()` receives `und`.

nuxt-easy-texts will call `load()` inside its plugin, right before it injects
`$texts` and `$textsPlural`. Make sure that anything that requires these two
methods is loaded **after** this plugin is initialized.

If `load()` depends on another Nuxt plugin, pass the name of that plugin as
`dependsOn` in the options, the second argument, so that it runs first:

```typescript
export default defineEasyTextsLoader(
  () => {
    // ...
  },
  {
    dependsOn: ['name-of-another-plugin'],
  },
)
```

### Fallback to the default texts

If `load()` throws, for example because the API is unavailable, nuxt-easy-texts
logs the error and uses the default texts from your code instead. That way
`$texts` and `$textsPlural` keep working, also in `error.vue`, which Nuxt shows
when the rest of the page can't be loaded either.

The default texts are built into a separate chunk. Browsers only download it
when loading the texts fails.

### Partial Language Override

If you need to override the language for parts of the page, you can do so using
the `<EasyTextsLanguageOverride>` component. Enable it in your config:

```typescript
export default defineNuxtConfig({
  easyTexts: {
    experimental: {
      languageOverride: true,
    },
  },
})
```

The component takes a `language` prop and will call the `load()` method of your
loader with the given language. It provides these overrides for all nested
`$texts` and `$textsPlural` calls.

If the language differs from the current one, the component will also set a
`lang` attribute to indicate that the child tree is in a different language. It
renders a `div`, or the element given in the `tag` prop.

**Important:** For this to work, you _must_ use
`const { $texts, $textsPlural } = useEasyTexts()` whenever an override is needed
in a template! This is because these two global properties are provided in a
plugin. Therefore, they can't use the usual provide/inject mechanism. Using
`useEasyTexts()` will return **different** `$texts` and `$textsPlural`
implementations that use overrides if available.

The override is provided to the children of `<EasyTextsLanguageOverride>`, so
call `useEasyTexts()` in a component rendered inside it:

```vue
<template>
  <EasyTextsLanguageOverride language="fr">
    <LegalNotice />
  </EasyTextsLanguageOverride>
</template>
```

```vue
<!-- components/LegalNotice.vue -->
<template>
  <p>{{ $texts('footer.legal', 'Legal notice') }}</p>
</template>

<script lang="ts" setup>
const { $texts } = useEasyTexts()
</script>
```

### Merge the live texts into the code

Over time, the texts editors change in production drift away from the default
texts in your code. `nuxt easy-texts merge` replaces the default texts in your
code with the texts of a running app:

```bash
npx nuxt easy-texts merge https://www.example.com/en
```

The texts are read from the payload of the rendered page, so this works with any
loader. Pass a page in the language of your default texts. Server-side rendering
must be enabled. The page may still run an older version of nuxt-easy-texts,
from 2.1.0 on, so you can merge before deploying the update. If loading the
texts failed and the page shows the
[default texts](#fallback-to-the-default-texts) instead, the command refuses to
merge.

Instead of a URL, you can pass a JSON file with the texts, keyed by full key, in
the shape `load()` returns them:

```bash
npx nuxt easy-texts merge texts.en.json
```

Run the command in the app directory, or pass `--cwd <dir>` after the command
name. A relative file path is resolved against the app directory.

Only string and template literals in the default text positions are replaced.
Calls without a default text and `globalTexts` in `nuxt.config.ts` are left
alone, and the command lists the keys it didn't update. Files in `node_modules`,
e.g. of installed layers, are never changed. The code isn't reformatted, so run
your formatter afterwards.

In a `.vue` file, a character that would end the surrounding syntax is written
as a `\x` escape: a quote that would end a template attribute like
`:title="$texts('key', 'Text')"`, the second `}` of a `}}` inside `{{ }}`, and
the `/` of a `</script` inside `<script>`.

| Option                   | Description                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--language <code>`      | The language to read, if the page loaded several.                                                                                                            |
| `--auth <user:password>` | Basic auth credentials, e.g. for a protected test environment. Defaults to the `NUXT_EASY_TEXTS_AUTH` environment variable, also from the app's `.env` file. |
| `--dry-run`              | Show the changes without writing them.                                                                                                                       |

`nuxt` answers `--help` itself, so use `nuxt easy-texts help` for the usage.

## Agent skill

The package ships an [agent skill](https://agentskills.io) in
`skills/nuxt-easy-texts`. It teaches coding agents like Claude Code how to use
`$texts`, `$textsPlural`, `useEasyTexts()`, the loader, the language override
and the merge command, and it matches the installed version of the module.

To link it into your project:

- With pnpm 12.11 or newer, run `pnpm approve nuxt-easy-texts`. pnpm links the
  skills of approved direct dependencies when it installs them.
- With [skills-npm](https://github.com/antfu/skills-npm), run
  `npm i -D skills-npm` and `npx skills-npm setup`. It links the skills of your
  installed packages on every install.

Or copy the skill from GitHub with the
[skills CLI](https://github.com/vercel-labs/skills):
`npx skills add dulnan/nuxt-easy-texts`. This copy follows the main branch, not
your installed version.

## How it works

nuxt-easy-texts searches your Vue components and JS/TS files for all calls to
the `$texts` and `$textsPlural` methods. Because of that, there are a few things
that won't work:

- Rename methods: The name of the method must be exactly `$texts` or
  `$textsPlural` - you can't rename them (e.g.
  `const { $texts: getText } = useEasyTexts()` will not work)
- Use variables: You can only use string literals inside both methods. Something
  like `{{ $texts('language_' + language) }}` will not work. Pass dynamic values
  as [replacements](#use-texts) instead

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

Each key is loaded as a GraphQL field whose name is the key with dots replaced
by double underscores, e.g. `cart.addButton` becomes `cart__addButton`. That
name must be a valid GraphQL name, so with this generator keys may only contain
ASCII letters, digits, underscores and dots, and must not start with a digit.
Keys also must not contain `__` or an underscore right before a dot, because
`mapDrupalTexts()` (see below) couldn't turn the field name back into the key.
The build fails with an error pointing at the call otherwise.

Use the fragment in a query on `textsLoader`:

```graphql
query loadTexts {
  textsLoader {
    ...easyTexts
  }
}
```

Then turn the result into the texts your loader returns with `mapDrupalTexts()`.
It turns each field name back into its key, e.g. `cart__addButton` into
`cart.addButton`, and each plural text into its singular and plural text.

```typescript
import { defineEasyTextsLoader } from 'nuxt-easy-texts/loader'
import { mapDrupalTexts } from 'nuxt-easy-texts/drupal'

export default defineEasyTextsLoader(() => {
  return {
    async load(language) {
      // Run the loadTexts query in the given language, with the GraphQL
      // client of your app.
      const data = await queryDrupal('loadTexts', language)
      return mapDrupalTexts(data.textsLoader)
    },
  }
})
```

### Load the texts

All default/singular/plural texts in your code are removed via a vite plugin,
for example:

```typescript
const { $texts, $textsPlural } = useEasyTexts()

const title = $texts('footerCopyright', '© 2024 ACME')

const counter = ref(1)
const countText = $textsPlural(
  'countText',
  counter.value,
  'One item',
  '@count items',
)
```

This is compiled to:

```typescript
const { $texts, $textsPlural } = useEasyTexts()

const title = $texts('footerCopyright')

const counter = ref(1)
const countText = $textsPlural('countText', counter.value)
```

nuxt-easy-texts requires that every text string is loaded at runtime. The
default texts are only used when loading the texts fails, see
[Fallback to the default texts](#fallback-to-the-default-texts).

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

Only the first dot separates the context from the key, so `cart.items.title` has
the context `cart` and the key `items.title`.

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

When the language changes, the texts of the new language must be loaded. To do
that, implement a `currentLanguage` method in your loader. The method should
return a computed property with the current language. nuxt-easy-texts adds a
watcher to this property on the client side and will load the texts by calling
`load()` with the new language when the value changes. The texts of each
language are only loaded once, so switching back to a language doesn't load its
texts again.

```typescript
import { defineEasyTextsLoader } from 'nuxt-easy-texts/loader'

export default defineEasyTextsLoader(() => {
  const appLanguage = useCurrentLanguage()

  return {
    load(language) {
      return $fetch('/api/load-texts', { query: { language } })
    },
    currentLanguage() {
      return computed(() => appLanguage.value)
    },
  }
})
```

`reloadTrigger`, the previous name of `currentLanguage`, still works, but is
deprecated.

**NOTE:** The watcher is only added client-side, not during SSR! During SSR,
`loader.load()` is called exactly once for the current language, and it must
return the correct translations.

Because the loaded texts are stored using `useState()` they are part of the
payload. So during hydration, the `loader.load()` method is not called.

## Reference

### Configuration reference

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-easy-texts'],

  easyTexts: {
    // Define which files to include. These are the defaults.
    // Patterns starting with ~ or @ are resolved for every layer, patterns
    // starting with . are relative to the root dir. Prefix a pattern with ! to
    // exclude files, e.g. '!~/components/stories/**'.
    pattern: [
      '~/components/**/*.{js,ts,vue}',
      '~/layouts/**/*.{js,ts,vue}',
      '~/layers/**/*.{js,ts,vue}',
      '~/pages/**/*.{js,ts,vue}',
      '~/composables/**/*.{js,ts,vue}',
      '~/error.vue',
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
    // Keys defined here can be used in code without a default text.
    globalTexts: {
      learnMore: 'Learn more',
      resultsTitle: ['1 result', '@count results'],
    },

    experimental: {
      // Enables the <EasyTextsLanguageOverride> component.
      languageOverride: false,

      // Enables the <EasyTextsDebugOverlay> component, which highlights the
      // rendered text keys in debug mode.
      advancedDebug: false,
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

// With replacements.
$texts('greeting', 'Hello @name!', { '@name': user.name })
```

#### $textsPlural

Use text string with a singular and plural option.

```typescript
const cartCount = ref(2)
$textsPlural('cartItems', cartCount.value, '1 item', '@count items')

// With replacements.
$textsPlural(
  'cartItemsIn',
  cartCount.value,
  '1 item in @cart',
  '@count items in @cart',
  { '@cart': cart.name },
)
```

The singular text is used when the count is 1. `@count` is replaced with the
count in both texts, so a translation may also use it in the singular text.

#### isDebug: ComputedRef<boolean>

Check if debug mode is enabled.

#### enableDebug: () => void

Enable debug mode.

#### disableDebug: () => void

Disable debug mode.

#### toggleDebug: () => void

Toggle debug mode.

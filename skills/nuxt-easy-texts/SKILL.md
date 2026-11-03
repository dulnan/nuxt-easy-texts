---
name: nuxt-easy-texts
description:
  Write and load translatable texts with nuxt-easy-texts. Use when adding or
  changing $texts or $textsPlural calls, using useEasyTexts() or
  <EasyTextsLanguageOverride>, writing the easyTexts.loader.ts loader, working
  with texts managed in Drupal, or merging live texts back into the code with
  nuxt easy-texts merge.
license: MIT
---

# nuxt-easy-texts

The module collects the `$texts` and `$textsPlural` calls of the app from the
source code at build time. Each call has a key and a default text. The
production build strips the default texts and keeps only the keys. At runtime,
the app's loader loads the text of each key, and the default texts are used only
when loading fails.

So the loaded text wins: changing a default text in the code changes a running
app only for keys the backend has no text for.

## Write texts

In a template, `$texts` and `$textsPlural` are available globally:

```vue
<template>
  <h1>{{ $texts('home.title', 'Welcome!') }}</h1>
  <p>{{ $textsPlural('cart.items', count, 'One item', '@count items') }}</p>
</template>
```

In a script, take them from `useEasyTexts()`, and wrap each text in
`computed()`, so that it follows a language change:

```ts
const { $texts } = useEasyTexts()
const label = computed(() => $texts('cart.checkout', 'Checkout'))
```

`useEasyTexts()` also returns `isDebug`, `enableDebug`, `disableDebug` and
`toggleDebug`. In debug mode, every text renders as its key.

The build extracts the calls from the source code, so every call must be
readable without running it:

- The method is named exactly `$texts` or `$textsPlural`. A renamed destructure,
  like `const { $texts: t } = useEasyTexts()`, is not collected.
- The key and the default texts are string literals, or template literals
  without `${}`. Pass dynamic values as replacements, the third argument of
  `$texts` and the fifth of `$textsPlural`:
  `$texts('greeting', 'Hello @name', { '@name': user.name })`. `$textsPlural`
  replaces `@count` with the count in both texts.
- The part of the key before the first dot is its context: `cart.items` has the
  context `cart`.
- All calls of a key have the same default texts. One call with the default
  texts is enough: other calls may pass the key alone, or `undefined` in place
  of the default text to add replacements. A key without a default text in any
  call needs one in `easyTexts.globalTexts` in `nuxt.config.ts`.
- The calls are in files matched by `easyTexts.pattern`. By default, these are
  `components/`, `layouts/`, `layers/`, `pages/`, `composables/` and `error.vue`
  in the app directory, but not `app.vue`, `plugins/` or `utils/`. A key used
  only in other files is not collected: the build warns, and production renders
  the key. Add those files to the pattern.
- Mention the methods in comments without the parenthesis, as `$texts`: a
  `$texts(` in a comment or a string is read as a call.

The dev server and the build report each call that breaks a rule, with its file.

## Load the texts

The loader is `easyTexts.loader.ts` in the app directory (`app/` by default):

```ts
import { defineEasyTextsLoader } from 'nuxt-easy-texts/loader'

export default defineEasyTextsLoader(() => {
  // The app's own source of the current language.
  const language = useCurrentLanguage()

  return {
    load: (language) => $fetch('/api/texts', { query: { language } }),
    currentLanguage: () => computed(() => language.value),
  }
})
```

- `load(language)` returns the texts of that language, keyed by full key: a
  string for a `$texts` key, `[singular, plural]` for a `$textsPlural` key. It
  loads the language it receives, which differs from the current language inside
  an `<EasyTextsLanguageOverride>`.
- `currentLanguage()` returns a computed of the language the page renders in. On
  the client, the texts reload when it changes. `reloadTrigger()` is its
  deprecated name.
- During server-side rendering, `load()` runs once and the texts go into the
  payload, so hydration doesn't call it again.
- If `load()` throws, the module logs the error and renders the default texts
  from the code.
- If the loader needs another plugin to run first, pass
  `{ dependsOn: ['plugin-name'] }` as the second argument of
  `defineEasyTextsLoader`.
- `easyTexts.generators` write the collected keys and default texts to files,
  e.g. JSON or a GraphQL fragment for the Drupal `texts` module, for the backend
  to use.

When the texts come from Drupal, through the `texts` module, the
`drupal-graphql-texts` generator or `mapDrupalTexts()`, read
[references/drupal.md](references/drupal.md) before adding, changing or
debugging a text.

## Show part of a page in another language

Enable the component in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  easyTexts: {
    experimental: { languageOverride: true },
  },
})
```

`<EasyTextsLanguageOverride language="fr">` loads the texts of that language
with the loader. If that is not the current language, it sets `lang="fr"` on its
element, a `div` or the `tag` prop. Only the functions that `useEasyTexts()`
returns inside it follow the override, so call `useEasyTexts()` in a child
component and use its `$texts` in the template:

```vue
<!-- LegalNotice.vue, rendered inside <EasyTextsLanguageOverride> -->
<script setup lang="ts">
const { $texts } = useEasyTexts()
</script>

<template>
  <p>{{ $texts('footer.legal', 'Legal notice') }}</p>
</template>
```

The global `$texts` stays in the current language, also inside the override.

## Merge the live texts into the code

Editors change the texts in the backend, and the default texts in the code drift
away. `nuxt easy-texts merge` replaces the default texts with the texts a
running app renders:

```bash
npx nuxt easy-texts merge https://www.example.com/en --dry-run
```

- Pass a server-rendered page in the language of the default texts. If the page
  loaded several languages, pick one with `--language <code>`.
- A JSON file with the texts, keyed by full key, works in place of the URL.
- For Basic auth, pass `--auth user:password`, or set `NUXT_EASY_TEXTS_AUTH`,
  also in the app's `.env`.
- Run it in the app directory, or pass `--cwd <dir>` after the command name.
  `nuxt` answers `--help` itself, so `nuxt easy-texts help` prints the usage.
- Start with `--dry-run`, which prints the changes without writing them.
- The command doesn't reformat, so run the formatter afterwards. In `.vue`
  files, it writes `\x22`, `\x27`, `\x7d`, `\x2f` or `\x26` where the plain
  character would end the attribute, the `{{ }}` or the `<script>`, or start a
  character reference like `&#39;`, which Vue decodes in templates. These
  escapes keep the file valid and safe, so leave them in place.
- It only updates calls in code. It lists the calls it left alone: in a comment,
  a string, the text of a template, or a template in another language than HTML,
  e.g. Pug.
- If loading the texts failed on the page, it rendered the default texts, and
  the command refuses to merge. Try again once the page loads its texts.

## More

The configuration reference and the generators are in the module's README:
`node_modules/nuxt-easy-texts/README.md`.

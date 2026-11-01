import { describe, it, expect } from 'vitest'
import { parse as parseJs } from 'acorn'
import { stringify } from 'devalue'
import { compileTemplate, parse as parseSfc } from '@vue/compiler-sfc'
import { extractMethodCalls } from '../../src/build/helpers/code'
import { extractPlural, extractSingle } from '../../src/build/helpers/ast'
import { mergeFile } from '../../src/build/merge/mergeFile'
import {
  getFallbackLanguages,
  getTextsFromPayload,
  parsePayload,
  pickLanguage,
} from '../../src/build/merge/readTexts'

/**
 * Extracts the texts from the code the way the collector does.
 */
function extract(code: string) {
  const single = extractMethodCalls(code, '$texts(').map((call) =>
    extractSingle(
      parseJs(call.code, { ecmaVersion: 'latest' }),
      'file.ts',
      call,
    ),
  )
  const plural = extractMethodCalls(code, '$textsPlural(').map((call) =>
    extractPlural(
      parseJs(call.code, { ecmaVersion: 'latest' }),
      'file.ts',
      call,
    ),
  )
  return [...single, ...plural]
}

describe('mergeFile', () => {
  it('replaces the default text and keeps the quote style', () => {
    const code = `$texts('title', 'Old')\n$texts("other", "Old other")`
    const result = mergeFile('file.ts', code, {
      title: 'New',
      other: 'New other',
    })

    expect(result.code).toBe(
      `$texts('title', 'New')\n$texts("other", "New other")`,
    )
    expect(result.changes).toEqual([
      { fullKey: 'title', line: 1, before: 'Old', after: 'New' },
      { fullKey: 'other', line: 2, before: 'Old other', after: 'New other' },
    ])
  })

  it('replaces the singular and plural texts', () => {
    const code = `$textsPlural('items', count, '1 item', '@count items')`
    const result = mergeFile('file.ts', code, {
      items: ['1 thing', '@count things'],
    })

    expect(result.code).toBe(
      `$textsPlural('items', count, '1 thing', '@count things')`,
    )
  })

  it('keeps the replacements argument', () => {
    const code = `$texts('greeting', 'Hi @name', { '@name': name })`
    const result = mergeFile('file.ts', code, { greeting: 'Hello @name' })

    expect(result.code).toBe(
      `$texts('greeting', 'Hello @name', { '@name': name })`,
    )
  })

  it('returns null when every text is the same', () => {
    const code = `$texts('title', 'Same')`

    expect(mergeFile('file.ts', code, { title: 'Same' }).code).toBeNull()
  })

  it('reports keys without a live text', () => {
    const code = `$texts('title', 'Title')`
    const result = mergeFile('file.ts', code, {})

    expect(result.code).toBeNull()
    expect(result.missing).toEqual(['title'])
  })

  it('leaves calls without a default text alone', () => {
    const code = `$texts('title')\n$texts('other', undefined, { '@a': a })`

    expect(
      mergeFile('file.ts', code, { title: 'A', other: 'B' }).code,
    ).toBeNull()
  })

  it.each([["''"], ['``'], ['`${a}`'], ['null'], ['undefined']])(
    'leaves a call alone whose default text the collector ignores: %s',
    (defaultText) => {
      const code = `$texts('title', ${defaultText})`

      expect(mergeFile('file.ts', code, { title: 'New' }).code).toBeNull()
    },
  )

  it('reports live texts with the wrong shape and leaves their calls alone', () => {
    const code = [
      `$textsPlural('numbers', n, 'One', 'Many')`,
      `$textsPlural('single', n, 'One', 'Many')`,
      `$texts('pair', 'Text')`,
      `$texts('empty', 'Text')`,
    ].join('\n')
    const result = mergeFile('file.ts', code, {
      numbers: [1, 2],
      single: 'One',
      pair: ['One', 'Many'],
      empty: '',
    })

    expect(result.code).toBeNull()
    expect(result.invalid).toEqual(['pair', 'empty', 'numbers', 'single'])
  })

  it('does not read inherited properties as live texts', () => {
    const code = `$texts('constructor', 'Text')`
    const result = mergeFile('file.ts', code, {})

    expect(result.code).toBeNull()
    expect(result.missing).toEqual(['constructor'])
  })

  it.each([
    ["'", `It's a "test"`],
    ['"', `It's a "test"`],
    ['`', 'A `test` with ${notAPlaceholder}'],
    ["'", 'A \\ backslash'],
    ["'", 'Two\nlines'],
  ])(
    'writes a %s literal that extracts to the live text: %s',
    (quote, text) => {
      const code = `$texts('title', ${quote}Old${quote})`
      const result = mergeFile('file.ts', code, { title: text })

      expect(extract(result.code!)[0]).toMatchObject({ defaultText: text })
    },
  )
})

/**
 * Returns the errors of compiling the template of a .vue file.
 */
function compileErrors(code: string) {
  const { descriptor } = parseSfc(code)
  return compileTemplate({
    source: descriptor.template!.content,
    filename: 'Component.vue',
    id: 'test',
  }).errors
}

describe('mergeFile in .vue files', () => {
  const text = `It's a "test"`

  it('escapes the quote of a double-quoted attribute', () => {
    const code = `<template><p :title="$texts('title', 'Old')" /></template>`
    const result = mergeFile('Component.vue', code, { title: text })

    expect(result.code).toBe(
      `<template><p :title="$texts('title', 'It\\'s a \\x22test\\x22')" /></template>`,
    )
    expect(compileErrors(result.code!)).toEqual([])
    expect(extract(result.code!)).toMatchObject([{ defaultText: text }])
  })

  it('escapes the quote of a single-quoted attribute', () => {
    const code = `<template><p :title='$texts("title", "Old")' /></template>`
    const result = mergeFile('Component.vue', code, { title: text })

    expect(result.code).toBe(
      `<template><p :title='$texts("title", "It\\x27s a \\"test\\"")' /></template>`,
    )
    expect(compileErrors(result.code!)).toEqual([])
    expect(extract(result.code!)).toMatchObject([{ defaultText: text }])
  })

  it('writes quotes as they are outside of attributes', () => {
    const code = `<template>
  <p>{{ $textsPlural('items', 2, '1 item', '@count items') }}</p>
</template>
<script setup lang="ts">
const title = $texts('title', 'Old')
</script>
`
    const result = mergeFile('Component.vue', code, {
      title: text,
      items: [`1 "item"`, `@count "items"`],
    })

    expect(result.code).toContain(
      `$textsPlural('items', 2, '1 "item"', '@count "items"')`,
    )
    expect(result.code).toContain(`$texts('title', 'It\\'s a "test"')`)
    expect(compileErrors(result.code!)).toEqual([])
  })

  it('escapes a }} inside an interpolation', () => {
    const code = `<template><p>{{ $texts('title', 'Old') }}</p></template>`
    const result = mergeFile('Component.vue', code, { title: 'Use {{name}}}' })

    expect(result.code).toContain(`'Use {{name}\\x7d\\x7d'`)
    expect(compileErrors(result.code!)).toEqual([])
    expect(extract(result.code!)).toMatchObject([
      { defaultText: 'Use {{name}}}' },
    ])
  })

  it('writes a }} in an attribute as it is', () => {
    const code = `<template><p :title="$texts('title', 'Old')" /></template>`
    const result = mergeFile('Component.vue', code, { title: 'Use {{name}}' })

    expect(result.code).toContain(`'Use {{name}}'`)
    expect(compileErrors(result.code!)).toEqual([])
  })

  it('escapes a </script inside a script block, in any case', () => {
    const code = `<script setup lang="ts">
const title = $texts('title', 'Old')
</script>
<template><p /></template>
`
    const text = 'A </SCRIPT> and a </b>'
    const result = mergeFile('Component.vue', code, { title: text })

    expect(result.code).toContain(`'A <\\x2fSCRIPT> and a </b>'`)
    expect(parseSfc(result.code!).errors).toEqual([])
    expect(extract(result.code!)).toMatchObject([{ defaultText: text }])
  })

  it('merges a file whose template is in another file', () => {
    const code = `<template src="./Component.html"></template>
<script setup lang="ts">
const title = $texts('title', 'Old')
</script>
`
    const result = mergeFile('Component.vue', code, { title: 'New' })

    expect(result.code).toContain(`$texts('title', 'New')`)
  })

  it('escapes both quotes anywhere in a template in another language', () => {
    const code = `<template lang="pug">
p {{ $texts('title', 'Old') }}
</template>
`
    const result = mergeFile('Component.vue', code, { title: text })

    expect(result.code).toContain(`$texts('title', 'It\\'s a \\x22test\\x22')`)
    expect(extract(result.code!)).toMatchObject([{ defaultText: text }])
  })
})

describe('reading the texts from a payload', () => {
  const translations = new Map([['de', { title: 'Titel' }]])

  it('reads the texts from the state', () => {
    const payload = parsePayload(
      stringify({ state: { $snuxt_easy_texts_translations: translations } }),
    )

    expect(getTextsFromPayload(payload)).toEqual(translations)
  })

  it('parses values that other reducers serialized', () => {
    class Custom {}
    const serialized = stringify(
      {
        data: new Custom(),
        state: { $snuxt_easy_texts_translations: translations },
      },
      { Custom: (value) => value instanceof Custom && 'custom' },
    )

    expect(getTextsFromPayload(parsePayload(serialized))).toEqual(translations)
  })

  it('reads the languages that use the default texts', () => {
    const payload = parsePayload(
      stringify({
        state: {
          $snuxt_easy_texts_translations: translations,
          $snuxt_easy_texts_fallback: ['de'],
        },
      }),
    )

    expect(getFallbackLanguages(payload)).toEqual(['de'])
    expect(getFallbackLanguages({ state: {} })).toEqual([])
  })

  it('reads the texts from the state of versions 2.1.0 to 2.2.0', () => {
    // The payload of a page rendered with nuxt-easy-texts 2.2.0.
    const serialized = String.raw`[["ShallowReactive",1],{"data":2,"state":4,"once":13,"_errors":14,"serverRendered":16,"path":17},["ShallowReactive",3],{},["Reactive",5],{"$snuxt_easy_texts_debug_enabled":6,"$snuxt_easy_texts":7},false,{"en":8},{"title":9,"cart.items":10},"Title edited in production",[11,12],"One edited item","@count edited items",["Set"],["ShallowReactive",15],{},true,"\u002F"]`

    expect(getTextsFromPayload(parsePayload(serialized))).toEqual(
      new Map([
        [
          'en',
          {
            title: 'Title edited in production',
            'cart.items': ['One edited item', '@count edited items'],
          },
        ],
      ]),
    )
  })

  it('prefers the current state over the one of older versions', () => {
    const payload = parsePayload(
      stringify({
        state: {
          $snuxt_easy_texts: { de: { title: 'Alt' } },
          $snuxt_easy_texts_translations: translations,
        },
      }),
    )

    expect(getTextsFromPayload(payload)).toEqual(translations)
  })

  it('names the oldest supported version for the state of version 2.0', () => {
    const payload = { state: { $snuxt_easy_texts: { title: 'Title' } } }

    expect(() => getTextsFromPayload(payload)).toThrow(
      'the page must use nuxt-easy-texts 2.1.0 or newer.',
    )
  })

  it('throws when the payload has no texts', () => {
    expect(() => getTextsFromPayload({ state: {} })).toThrow(
      'The page has no texts in its payload.',
    )
  })

  it('picks the only language, or the given one', () => {
    const several = new Map([
      ['de', { title: 'Titel' }],
      ['fr', { title: 'Titre' }],
    ])

    expect(pickLanguage(translations).language).toBe('de')
    expect(pickLanguage(several, 'fr').texts).toEqual({ title: 'Titre' })
    expect(() => pickLanguage(several)).toThrow('Pick one with --language.')
    expect(() => pickLanguage(new Map())).toThrow('The page loaded no texts.')
  })
})

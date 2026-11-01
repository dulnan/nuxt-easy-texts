import { describe, it, expect } from 'vitest'
import type { ModuleHelper } from '../../src/build/classes/ModuleHelper'
import type { Extraction } from '../../src/build/types/extraction'
import { parseKey } from '../../src/build/helpers/ast'
import generatorDrupal from '../../src/build/templates/definitions/generatorDrupal'
import { mapDrupalTexts } from '../../src/drupal'

describe('mapDrupalTexts', () => {
  it('turns field names back into keys', () => {
    expect(
      mapDrupalTexts({
        homeTitle: 'Welcome',
        cart__addButton: 'Add to cart',
        cart__items__title: 'Items',
      }),
    ).toEqual({
      homeTitle: 'Welcome',
      'cart.addButton': 'Add to cart',
      'cart.items.title': 'Items',
    })
  })

  it('turns plural texts into their singular and plural text', () => {
    expect(
      mapDrupalTexts({
        cart__items: { singular: '1 item', plural: '@count items' },
        emptySingular: { singular: '', plural: '@count items' },
        missingPlural: { singular: '1 item', plural: null },
      }),
    ).toEqual({
      'cart.items': ['1 item', '@count items'],
      emptySingular: ['', '@count items'],
      missingPlural: ['1 item', ''],
    })
  })

  it('skips fields without a text and the type name', () => {
    expect(
      mapDrupalTexts({
        __typename: 'TextsLoader',
        missing: null,
        notLoaded: undefined,
        homeTitle: '',
      }),
    ).toEqual({ homeTitle: '' })
  })

  it('returns no texts for a missing result', () => {
    expect(mapDrupalTexts(null)).toEqual({})
    expect(mapDrupalTexts(undefined)).toEqual({})
  })

  it('accepts the result type GraphQL clients generate', () => {
    type LoadTextsQuery = {
      textsLoader?: {
        __typename?: 'TextsLoader'
        homeTitle?: string | null
        cart__items?: {
          __typename?: 'TextsPlural'
          singular?: string | null
          plural?: string | null
        } | null
      } | null
    }
    const data: LoadTextsQuery = {
      textsLoader: {
        homeTitle: 'Welcome',
        cart__items: { singular: '1 item', plural: '@count items' },
      },
    }

    expect(mapDrupalTexts(data.textsLoader)).toEqual({
      homeTitle: 'Welcome',
      'cart.items': ['1 item', '@count items'],
    })
  })

  it('maps every field of the generated fragment back to its key', async () => {
    const fullKeys = ['homeTitle', 'cart.addButton', 'cart.items.title']
    const extractions: Extraction[] = fullKeys.map((fullKey) => ({
      type: 'text',
      fullKey,
      ...parseKey(fullKey),
      defaultText: 'Text',
      filePath: 'a.vue',
    }))
    const fragment = await generatorDrupal('fragment.graphql').build!(
      extractions,
      {} as ModuleHelper,
    )

    // Answer every field of the fragment, as Drupal would.
    const fieldNames = [...fragment.matchAll(/^ {2}(\w+): getText\(/gm)].map(
      (match) => match[1]!,
    )
    const result = Object.fromEntries(fieldNames.map((v) => [v, 'Text']))

    expect(fieldNames).toHaveLength(fullKeys.length)
    expect(Object.keys(mapDrupalTexts(result)).sort()).toEqual(
      [...fullKeys].sort(),
    )
  })
})

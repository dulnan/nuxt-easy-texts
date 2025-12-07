import { describe, it, expect } from 'vitest'
import { defineEasyTextsLoader } from '../../src/loader'
import { computed } from 'vue'
import type { EasyTextsLoaderCallback } from '../../src/runtime/types'

describe('defineEasyTextsLoader', () => {
  it('returns an EasyTextsLoader object with getLoader and options', () => {
    const mockLoader = () => ({
      load: async () => ({}),
      currentLanguage: () => computed(() => 'en'),
    })

    const result = defineEasyTextsLoader(mockLoader)

    expect(result).toHaveProperty('getLoader')
    expect(result).toHaveProperty('options')
    expect(result.getLoader).toBe(mockLoader)
    expect(result.options).toEqual({})
  })

  it('accepts custom options', () => {
    const mockLoader = () => ({
      load: async () => ({}),
      currentLanguage: () => computed(() => 'en'),
    })

    const options = { dependsOn: ['nuxt:router' as const] }
    const result = defineEasyTextsLoader(mockLoader, options)

    expect(result.options).toEqual(options)
    expect(result.options.dependsOn).toEqual(['nuxt:router'])
  })

  it('returns a functional loader that can load texts', async () => {
    const textsData = {
      'hello.world': 'Hello World',
      'plural.key': ['One item', '@count items'],
    }

    const mockLoader = () => ({
      load: async (language: string) => {
        return language === 'en' ? textsData : {}
      },
      currentLanguage: () => computed(() => 'en'),
    })

    const result = defineEasyTextsLoader(mockLoader)
    const loader = result.getLoader()

    const texts = await loader.load('en')
    expect(texts).toEqual(textsData)

    const emptyTexts = await loader.load('de')
    expect(emptyTexts).toEqual({})
  })

  it('supports reloadTrigger (deprecated) callback', () => {
    const mockLoader = (): EasyTextsLoaderCallback => ({
      load: async () => ({}),
      reloadTrigger: () => computed(() => 'trigger-value'),
    })

    const result = defineEasyTextsLoader(mockLoader)
    const loader = result.getLoader()

    // Type assertion to access reloadTrigger variant
    const loaderWithTrigger = loader as {
      load: typeof loader.load
      reloadTrigger?: () => ReturnType<typeof computed<string>>
    }
    expect(loaderWithTrigger.reloadTrigger).toBeDefined()
    const trigger = loaderWithTrigger.reloadTrigger!()
    expect(trigger.value).toBe('trigger-value')
  })

  it('supports currentLanguage callback', () => {
    const mockLoader = (): EasyTextsLoaderCallback => ({
      load: async () => ({}),
      currentLanguage: () => computed(() => 'fr'),
    })

    const result = defineEasyTextsLoader(mockLoader)
    const loader = result.getLoader()

    // Type assertion to access currentLanguage variant
    const loaderWithLanguage = loader as {
      load: typeof loader.load
      currentLanguage?: () => ReturnType<typeof computed<string>>
    }
    expect(loaderWithLanguage.currentLanguage).toBeDefined()
    const language = loaderWithLanguage.currentLanguage!()
    expect(language.value).toBe('fr')
  })

  it('works with empty dependsOn array', () => {
    const mockLoader = () => ({
      load: async () => ({}),
      currentLanguage: () => computed(() => 'en'),
    })

    const result = defineEasyTextsLoader(mockLoader, { dependsOn: [] })

    expect(result.options.dependsOn).toEqual([])
  })
})

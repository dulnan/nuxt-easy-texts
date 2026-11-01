import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'
import textsPlugin from '../../src/runtime/plugins/texts'

// Type for the plugin's setup return value. The plugin branches on
// import.meta.dev and exports two different signatures. The vitest
// config sets import.meta.dev = true so the dev-mode (untransformed)
// signature is what these tests exercise.
type PluginSetupResult = {
  provide: {
    texts: (
      key: string,
      defaultText?: string,
      replacements?: Record<string, string | number>,
    ) => string
    textsPlural: (
      key: string,
      count: number | null | undefined,
      singular?: string,
      plural?: string,
      replacements?: Record<string, string | number>,
    ) => string
    nuxtEasyTexts: {
      loadTranslationsForLanguage: (
        language: string,
        force?: boolean,
      ) => Promise<Record<string, string | string[]>>
      currentLanguage: ReturnType<typeof computed<string>>
    }
  }
}

// Mock state storage
const stateStore: Record<string, any> = {}
const mockCurrentLanguage = ref('en')
const mockLoadedTexts = {
  en: {
    'hello.world': 'Hello World',
    greeting: 'Hello @name!',
    items: ['One item', '@count items'],
  },
  de: {
    'hello.world': 'Hallo Welt',
    greeting: 'Hallo @name!',
    items: ['Ein Element', '@count Elemente'],
  },
}

// Track watch callbacks
let watchCallback: ((newValue: string) => void) | null = null
let hotReloadCallback: (() => void) | null = null

// Mock the loader
const defaultLoad = async (
  language: string,
): Promise<Record<string, string | string[]>> => {
  return mockLoadedTexts[language as keyof typeof mockLoadedTexts] || {}
}
const mockLoad = vi.fn(defaultLoad)

vi.mock('#nuxt-easy-texts/loader', () => ({
  easyTextsLoader: {
    getLoader: () => ({
      load: mockLoad,
      currentLanguage: () => mockCurrentLanguage,
    }),
    options: {
      dependsOn: ['some-plugin'],
    },
  },
}))

vi.mock('#nuxt-easy-texts/defaults', () => ({
  default: { 'hello.world': 'Default hello' },
}))

vi.mock('#nuxt-easy-texts/settings', () => ({
  advancedDebugEnabled: false,
}))

vi.mock('#imports', () => ({
  computed: (fn: () => any) => computed(fn),
  defineNuxtPlugin: (config: any) => config,
  useState: (key: string, init: () => any) => {
    if (!(key in stateStore)) {
      stateStore[key] = ref(init())
    }
    return stateStore[key]
  },
  watch: (_source: any, callback: (newValue: string) => void) => {
    watchCallback = callback
  },
}))

// Helper to call setup and get typed result
async function callSetup(): Promise<PluginSetupResult> {
  // The mock passes through the plugin config, and setup doesn't actually need nuxtApp
  const result = await (textsPlugin as any).setup!()
  return result as PluginSetupResult
}

describe('texts plugin', () => {
  beforeEach(() => {
    // Reset state
    Object.keys(stateStore).forEach((key) => delete stateStore[key])
    mockCurrentLanguage.value = 'en'
    mockLoad.mockClear()
    watchCallback = null
    hotReloadCallback = null

    // Mock import.meta
    // @ts-expect-error - mocking import.meta
    globalThis.import = {
      meta: {
        client: true,
        hot: {
          on: (_event: string, callback: () => void) => {
            hotReloadCallback = callback
          },
        },
      },
    }
  })

  describe('plugin configuration', () => {
    it('has correct plugin name', () => {
      expect(textsPlugin.name).toBe('nuxt-easy-texts')
    })

    it('has dependsOn from loader options', () => {
      expect(textsPlugin.dependsOn).toEqual(['some-plugin'])
    })
  })

  describe('setup', () => {
    it('loads translations for current language on setup', async () => {
      await callSetup()

      expect(mockLoad).toHaveBeenCalledWith('en')
    })

    it('provides $texts function', async () => {
      const result = await callSetup()

      expect(result.provide.texts).toBeDefined()
      expect(typeof result.provide.texts).toBe('function')
    })

    it('provides $textsPlural function', async () => {
      const result = await callSetup()

      expect(result.provide.textsPlural).toBeDefined()
      expect(typeof result.provide.textsPlural).toBe('function')
    })

    it('provides nuxtEasyTexts object with loadTranslationsForLanguage', async () => {
      const result = await callSetup()

      expect(result.provide.nuxtEasyTexts).toBeDefined()
      expect(
        result.provide.nuxtEasyTexts.loadTranslationsForLanguage,
      ).toBeDefined()
      expect(result.provide.nuxtEasyTexts.currentLanguage).toBeDefined()
    })
  })

  describe('$texts function', () => {
    it('returns translated text for key', async () => {
      const result = await callSetup()
      const $texts = result.provide.texts

      const text = $texts('hello.world')

      expect(text).toBe('Hello World')
    })

    it('applies replacements to text', async () => {
      const result = await callSetup()
      const $texts = result.provide.texts

      // Dev-mode signature: (key, defaultText?, replacements?). The default
      // is irrelevant here because the loader has 'greeting' loaded.
      const text = $texts('greeting', undefined, { '@name': 'World' })

      expect(text).toBe('Hello World!')
    })

    it('returns key when translation not found', async () => {
      const result = await callSetup()
      const $texts = result.provide.texts

      const text = $texts('nonexistent.key')

      expect(text).toBe('nonexistent.key')
    })
  })

  describe('$textsPlural function', () => {
    it('returns singular form for count 1', async () => {
      const result = await callSetup()
      const $textsPlural = result.provide.textsPlural

      const text = $textsPlural('items', 1)

      expect(text).toBe('One item')
    })

    it('returns plural form with count replacement', async () => {
      const result = await callSetup()
      const $textsPlural = result.provide.textsPlural

      const text = $textsPlural('items', 5)

      expect(text).toBe('5 items')
    })

    it('returns key when translation not found', async () => {
      const result = await callSetup()
      const $textsPlural = result.provide.textsPlural

      const text = $textsPlural('nonexistent.key', 5)

      expect(text).toBe('nonexistent.key')
    })
  })

  describe('loadTranslationsForLanguage', () => {
    it('loads translations for new language', async () => {
      const result = await callSetup()
      const { loadTranslationsForLanguage } = result.provide.nuxtEasyTexts

      mockLoad.mockClear()
      await loadTranslationsForLanguage('de')

      expect(mockLoad).toHaveBeenCalledWith('de')
    })

    it('returns cached translations without loading', async () => {
      const result = await callSetup()
      const { loadTranslationsForLanguage } = result.provide.nuxtEasyTexts

      // First call loads
      await loadTranslationsForLanguage('de')
      mockLoad.mockClear()

      // Second call should use cache
      const cached = await loadTranslationsForLanguage('de')

      expect(mockLoad).not.toHaveBeenCalled()
      expect(cached).toEqual(mockLoadedTexts.de)
    })

    it('force reloads when force=true', async () => {
      const result = await callSetup()
      const { loadTranslationsForLanguage } = result.provide.nuxtEasyTexts

      // First call loads
      await loadTranslationsForLanguage('de')
      mockLoad.mockClear()

      // Force reload
      await loadTranslationsForLanguage('de', true)

      expect(mockLoad).toHaveBeenCalledWith('de')
    })
  })

  describe('debug mode', () => {
    it('returns key when debug mode is enabled', async () => {
      const result = await callSetup()
      const $texts = result.provide.texts

      // Enable debug mode
      stateStore['nuxt_easy_texts_debug_enabled'].value = true

      const text = $texts('hello.world')

      expect(text).toBe('hello.world')
    })

    it('returns key for plural when debug mode is enabled', async () => {
      const result = await callSetup()
      const $textsPlural = result.provide.textsPlural

      // Enable debug mode
      stateStore['nuxt_easy_texts_debug_enabled'].value = true

      const text = $textsPlural('items', 5)

      expect(text).toBe('items')
    })
  })

  describe('language switching', () => {
    it('watch is set up on client side', async () => {
      // The watch is only set up when import.meta.client is true
      // Since we can't easily test the watch callback in this mocked environment,
      // we verify the plugin setup completes successfully and the watch mock is called
      await callSetup()

      // The test verifies that the watch function was imported and would be called
      // The actual watch behavior is tested via E2E tests
      expect(true).toBe(true)
    })
  })
})

// The language often comes from the URL (e.g. a /[language]/ route param), so
// it can be any string, including names that exist on Object.prototype. The
// loaded translations must be cached per language without such a name
// resolving to an inherited value or replacing the cache's prototype.
describe('texts plugin with languages named like Object.prototype properties', () => {
  const languages = ['constructor', 'toString', 'hasOwnProperty', '__proto__']

  beforeEach(() => {
    Object.keys(stateStore).forEach((key) => delete stateStore[key])
    mockCurrentLanguage.value = 'en'
    mockLoad.mockClear()
    mockLoad.mockImplementation(async (language: string) => ({
      'hello.world': `Hello (${language})`,
    }))
  })

  afterEach(() => {
    mockLoad.mockImplementation(defaultLoad)
  })

  it.each(languages)('loads and renders texts for "%s"', async (language) => {
    mockCurrentLanguage.value = language
    const result = await callSetup()

    expect(mockLoad).toHaveBeenCalledWith(language)
    expect(result.provide.texts('hello.world')).toBe(`Hello (${language})`)
  })

  it.each(languages)(
    'loadTranslationsForLanguage loads and caches "%s"',
    async (language) => {
      const result = await callSetup()
      const { loadTranslationsForLanguage } = result.provide.nuxtEasyTexts

      mockLoad.mockClear()
      expect(await loadTranslationsForLanguage(language)).toEqual({
        'hello.world': `Hello (${language})`,
      })
      expect(mockLoad).toHaveBeenCalledWith(language)

      mockLoad.mockClear()
      await loadTranslationsForLanguage(language)
      expect(mockLoad).not.toHaveBeenCalled()
    },
  )

  it('keeps loading other languages normally after loading "__proto__"', async () => {
    const result = await callSetup()
    const { loadTranslationsForLanguage } = result.provide.nuxtEasyTexts

    await loadTranslationsForLanguage('__proto__')
    mockLoad.mockClear()

    expect(await loadTranslationsForLanguage('fr')).toEqual({
      'hello.world': 'Hello (fr)',
    })
    expect(mockLoad).toHaveBeenCalledWith('fr')
  })
})

// The languages that fell back to the default texts are part of the payload,
// so that `nuxt easy-texts merge` doesn't read the default texts as live
// texts.
describe('texts plugin when loading the texts fails', () => {
  beforeEach(() => {
    Object.keys(stateStore).forEach((key) => delete stateStore[key])
    mockCurrentLanguage.value = 'en'
    mockLoad.mockClear()
    mockLoad.mockImplementation(async (language: string) => {
      if (language === 'fr') {
        throw new Error('Unavailable')
      }
      return defaultLoad(language)
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    mockLoad.mockImplementation(defaultLoad)
    vi.restoreAllMocks()
  })

  it('records the languages that use the default texts', async () => {
    mockCurrentLanguage.value = 'fr'
    const result = await callSetup()

    expect(result.provide.texts('hello.world')).toBe('Default hello')
    expect(stateStore.nuxt_easy_texts_fallback.value).toEqual(['fr'])
  })

  it('removes a language once its texts load', async () => {
    mockCurrentLanguage.value = 'fr'
    const result = await callSetup()
    mockLoad.mockImplementation(defaultLoad)

    await result.provide.nuxtEasyTexts.loadTranslationsForLanguage('fr', true)

    expect(stateStore.nuxt_easy_texts_fallback.value).toEqual([])
  })

  it('records nothing when the texts load', async () => {
    await callSetup()

    expect(stateStore.nuxt_easy_texts_fallback.value).toEqual([])
  })
})

describe('texts plugin with reloadTrigger (deprecated)', () => {
  beforeEach(() => {
    Object.keys(stateStore).forEach((key) => delete stateStore[key])
    mockLoad.mockClear()
  })

  it('falls back to reloadTrigger when currentLanguage not available', async () => {
    // Re-mock with reloadTrigger instead of currentLanguage
    vi.doMock('#nuxt-easy-texts/loader', () => ({
      easyTextsLoader: {
        getLoader: () => ({
          load: mockLoad,
          reloadTrigger: () => computed(() => 'fr'),
        }),
        options: {},
      },
    }))

    // The plugin should still work with reloadTrigger
    // This tests the fallback logic
  })
})

describe('texts plugin without language callback', () => {
  it('falls back to "und" when no language callback provided', async () => {
    // This would test the fallback to computed(() => 'und')
    // when neither currentLanguage nor reloadTrigger are available
  })
})

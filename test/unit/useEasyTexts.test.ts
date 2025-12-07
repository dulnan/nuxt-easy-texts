import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { useEasyTexts } from '../../src/runtime/composables/useEasyTexts'

// Mock #nuxt-easy-texts/settings before other imports
vi.mock('#nuxt-easy-texts/settings', () => ({
  advancedDebugEnabled: false,
}))

// Mock the #imports module
const mockIsDebugState = ref(false)
const mockOverride = ref<Record<string, string | string[]> | null>(null)
let mockInjectValue: any = null

const mockTexts = vi.fn((key: string) => `translated:${key}`)
const mockTextsPlural = vi.fn(
  (key: string, count: number) => `plural:${key}:${count}`,
)

vi.mock('#imports', () => ({
  computed: (fn: () => any) => computed(fn),
  useNuxtApp: () => ({
    $texts: mockTexts,
    $textsPlural: mockTextsPlural,
  }),
  useState: (_key: string, init: () => boolean) => {
    if (mockIsDebugState.value === false && init) {
      mockIsDebugState.value = init()
    }
    return mockIsDebugState
  },
  inject: (_key: string, defaultValue: any) => {
    return mockInjectValue ?? defaultValue
  },
}))

describe('useEasyTexts', () => {
  beforeEach(() => {
    mockIsDebugState.value = false
    mockInjectValue = null
    mockOverride.value = null
    mockTexts.mockClear()
    mockTextsPlural.mockClear()
  })

  describe('debug mode', () => {
    it('isDebug starts as false', () => {
      const { isDebug } = useEasyTexts()
      expect(isDebug.value).toBe(false)
    })

    it('enableDebug sets isDebug to true', () => {
      const { isDebug, enableDebug } = useEasyTexts()
      expect(isDebug.value).toBe(false)

      enableDebug()
      expect(isDebug.value).toBe(true)
    })

    it('disableDebug sets isDebug to false', () => {
      const { isDebug, enableDebug, disableDebug } = useEasyTexts()

      enableDebug()
      expect(isDebug.value).toBe(true)

      disableDebug()
      expect(isDebug.value).toBe(false)
    })

    it('toggleDebug toggles isDebug value', () => {
      const { isDebug, toggleDebug } = useEasyTexts()

      expect(isDebug.value).toBe(false)

      toggleDebug()
      expect(isDebug.value).toBe(true)

      toggleDebug()
      expect(isDebug.value).toBe(false)
    })
  })

  describe('$texts without override', () => {
    it('calls app.$texts when no override is injected', () => {
      const { $texts } = useEasyTexts()

      $texts('my.key', 'default text')

      expect(mockTexts).toHaveBeenCalledWith('my.key', 'default text')
    })

    it('passes replacements to app.$texts', () => {
      const { $texts } = useEasyTexts()

      $texts('greeting.key', 'Hello @name', { '@name': 'World' })

      expect(mockTexts).toHaveBeenCalledWith('greeting.key', 'Hello @name', {
        '@name': 'World',
      })
    })
  })

  describe('$textsPlural without override', () => {
    it('calls app.$textsPlural when no override is injected', () => {
      const { $textsPlural } = useEasyTexts()

      $textsPlural('items.key', 5, 'One item', '@count items')

      expect(mockTextsPlural).toHaveBeenCalledWith(
        'items.key',
        5,
        'One item',
        '@count items',
      )
    })

    it('passes replacements to app.$textsPlural', () => {
      const { $textsPlural } = useEasyTexts()

      $textsPlural('items.key', 3, 'One item', '@count items', {
        '@extra': 'value',
      })

      expect(mockTextsPlural).toHaveBeenCalledWith(
        'items.key',
        3,
        'One item',
        '@count items',
        { '@extra': 'value' },
      )
    })
  })

  describe('$texts with override', () => {
    it('uses override texts when injected', () => {
      mockInjectValue = ref({
        'my.key': 'Overridden text',
      })

      const { $texts } = useEasyTexts()
      // When override is active, $texts(key, replacements?) - no default text arg
      const result = (
        $texts as (key: string, replacements?: Record<string, string>) => string
      )('my.key')

      // Should use getSingleText with override, not app.$texts
      expect(mockTexts).not.toHaveBeenCalled()
      expect(result).toBe('Overridden text')
    })

    it('applies replacements with override', () => {
      mockInjectValue = ref({
        'greeting.key': 'Hallo @name!',
      })

      const { $texts } = useEasyTexts()
      // When override is active, second arg is replacements
      const result = (
        $texts as (key: string, replacements?: Record<string, string>) => string
      )('greeting.key', { '@name': 'Welt' })

      expect(result).toBe('Hallo Welt!')
    })

    it('returns key when debug mode is enabled with override', () => {
      mockInjectValue = ref({
        'my.key': 'Overridden text',
      })

      const { $texts, enableDebug } = useEasyTexts()
      enableDebug()

      const result = (
        $texts as (key: string, replacements?: Record<string, string>) => string
      )('my.key')
      expect(result).toBe('my.key')
    })
  })

  describe('$textsPlural with override', () => {
    type OverridePluralFn = (
      key: string,
      count: number | string | null | undefined,
      replacements?: Record<string, string | number>,
    ) => string

    it('uses override plural texts when injected', () => {
      mockInjectValue = ref({
        'items.key': ['Ein Element', '@count Elemente'],
      })

      const { $textsPlural } = useEasyTexts()
      // When override is active, $textsPlural(key, count, replacements?) - no singular/plural defaults
      const result = ($textsPlural as OverridePluralFn)('items.key', 5)

      expect(mockTextsPlural).not.toHaveBeenCalled()
      expect(result).toBe('5 Elemente')
    })

    it('returns singular form with count 1', () => {
      mockInjectValue = ref({
        'items.key': ['Ein Element', '@count Elemente'],
      })

      const { $textsPlural } = useEasyTexts()
      const result = ($textsPlural as OverridePluralFn)('items.key', 1)

      expect(result).toBe('Ein Element')
    })

    it('applies replacements with override plural', () => {
      mockInjectValue = ref({
        'cart.key': ['@user hat ein Produkt', '@user hat @count Produkte'],
      })

      const { $textsPlural } = useEasyTexts()
      // When override is active, third arg is replacements
      const result = ($textsPlural as OverridePluralFn)('cart.key', 3, {
        '@user': 'Max',
      })

      expect(result).toBe('Max hat 3 Produkte')
    })

    it('returns key when debug mode is enabled with override', () => {
      mockInjectValue = ref({
        'items.key': ['Ein Element', '@count Elemente'],
      })

      const { $textsPlural, enableDebug } = useEasyTexts()
      enableDebug()

      const result = ($textsPlural as OverridePluralFn)('items.key', 5)
      expect(result).toBe('items.key')
    })
  })

  describe('return value structure', () => {
    it('returns all expected properties', () => {
      const result = useEasyTexts()

      expect(result).toHaveProperty('$texts')
      expect(result).toHaveProperty('$textsPlural')
      expect(result).toHaveProperty('isDebug')
      expect(result).toHaveProperty('enableDebug')
      expect(result).toHaveProperty('disableDebug')
      expect(result).toHaveProperty('toggleDebug')

      expect(typeof result.$texts).toBe('function')
      expect(typeof result.$textsPlural).toBe('function')
      expect(typeof result.enableDebug).toBe('function')
      expect(typeof result.disableDebug).toBe('function')
      expect(typeof result.toggleDebug).toBe('function')
    })
  })
})

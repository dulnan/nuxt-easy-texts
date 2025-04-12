import type { EasyTextsPluralFunction } from './runtime/types'
import type { EasyTexts, EasyTextsKey } from '#nuxt-easy-texts/keys'

declare module '#app' {
  interface NuxtApp {
    $texts: {
      <T extends EasyTextsKey>(key: T, defaultText: EasyTexts[T]): string
      (key: string, defaultText: string): string
    }
    $textsPlural: EasyTextsPluralFunction
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $texts: {
      <T extends EasyTextsKey>(key: T, defaultText: EasyTexts[T]): string
      (key: string, defaultText: string): string
    }
    $textsPlural: EasyTextsPluralFunction
  }
}

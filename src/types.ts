import { type EasyTextsPluralFunction } from '#nuxt-easy-texts/types'
import { type ExistingTexts } from '#nuxt-easy-texts/generated-types'

declare module '#app' {
  interface NuxtApp {
    $texts: {
      <T extends keyof ExistingTexts>(
        key: T,
        defaultText: ExistingTexts[T],
      ): string
      (key: string, defaultText: string): string
    }
    $textsPlural: EasyTextsPluralFunction
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $texts: {
      <T extends keyof ExistingTexts>(
        key: T,
        defaultText: ExistingTexts[T],
      ): string
      (key: string, defaultText: string): string
    }
    $textsPlural: EasyTextsPluralFunction
  }
}

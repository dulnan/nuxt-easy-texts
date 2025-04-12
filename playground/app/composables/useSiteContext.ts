import { useNuxtApp, computed, type ComputedRef } from '#imports'

type UseSiteContext = {
  siteName: ComputedRef<string>
}

export default function (): UseSiteContext {
  const { $texts } = useNuxtApp()
  const siteName = computed(() => {
    const a = $texts('a.siteName', 'nuxt-easy-texts')
    const b = $texts('b.siteName', 'Playground')

    return `${a} ${b}`
  })

  return { siteName }
}

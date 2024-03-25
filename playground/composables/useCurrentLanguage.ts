import { useRoute, computed } from '#imports'

export default function () {
  const route = useRoute()

  return computed(() => {
    const param = route.params.language
    if (param && typeof param === 'string') {
      return param
    }

    return 'en'
  })
}

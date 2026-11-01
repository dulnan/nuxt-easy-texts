import { createError, defineEventHandler, getQuery } from 'h3'
import fragment from 'raw:../../fragment.easyTexts.graphql'
import { useRuntimeConfig } from '#imports'

const query = `query loadTexts { textsLoader { ...easyTexts } }
${new TextDecoder().decode(fragment)}`

type DrupalText =
  | string
  | { singular: string | null; plural: string | null }
  | null

type GraphqlResponse = {
  data?: { textsLoader: Record<string, DrupalText> | null }
  errors?: { message: string }[]
}

/**
 * Loads all texts in the given language from Drupal, using the fragment the
 * drupal-graphql-texts generator writes.
 */
export default defineEventHandler(async (event) => {
  const language = getQuery(event).language === 'de' ? 'de' : 'en'
  const { drupalUrl } = useRuntimeConfig(event)

  // English is the default language in Drupal and has no path prefix.
  const prefix = language === 'en' ? '' : `/${language}`
  const response = await $fetch<GraphqlResponse>(
    `${drupalUrl}${prefix}/graphql`,
    {
      method: 'POST',
      body: { query },
    },
  )

  const result = response.data?.textsLoader
  if (response.errors?.length || !result) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Loading the texts from Drupal failed.',
      data: response.errors,
    })
  }

  const texts: Record<string, string | [string, string]> = {}
  for (const [fieldName, value] of Object.entries(result)) {
    // The generator names each field after its key, with dots replaced by
    // double underscores.
    const key = fieldName.replaceAll('__', '.')
    if (typeof value === 'string') {
      texts[key] = value
    } else if (value) {
      texts[key] = [value.singular ?? '', value.plural ?? '']
    }
  }

  return texts
})

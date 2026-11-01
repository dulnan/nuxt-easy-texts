/**
 * One field in the result of the fragment the drupal-graphql-texts generator
 * writes: a string for a $texts key, an object for a $textsPlural key, or
 * null if Drupal returned nothing.
 */
export type DrupalText =
  | string
  | { singular?: string | null; plural?: string | null }
  | null
  | undefined

/**
 * Turns the result of the easyTexts fragment into the texts a loader returns.
 *
 * The drupal-graphql-texts generator loads every key as a field named after
 * the key, with its dots replaced by double underscores. This turns each field
 * name back into the key, and each plural text into its singular and plural
 * text.
 *
 * @example
 * ```ts
 * // query { textsLoader { ...easyTexts } }
 * return mapDrupalTexts(data.textsLoader)
 * ```
 */
export function mapDrupalTexts(
  result: Record<string, DrupalText> | null | undefined,
): Record<string, string | [string, string]> {
  const texts: Record<string, string | [string, string]> = {}

  for (const [fieldName, value] of Object.entries(result ?? {})) {
    // GraphQL clients may add the type name, which is never a text.
    if (fieldName === '__typename' || value === null || value === undefined) {
      continue
    }

    const key = fieldName.replaceAll('__', '.')
    texts[key] =
      typeof value === 'string'
        ? value
        : [value.singular ?? '', value.plural ?? '']
  }

  return texts
}

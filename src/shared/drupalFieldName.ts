/**
 * The GraphQL field name the drupal-graphql-texts generator loads a key as:
 * dots become double underscores, e.g. "cart.addButton" => "cart__addButton".
 */
export function toDrupalFieldName(fullKey: string): string {
  return fullKey.replaceAll('.', '__')
}

/**
 * The key mapDrupalTexts() reads a field name back as: double underscores
 * become dots.
 *
 * This only gives back the original key if the key contains no "__" and no
 * underscore right before a dot. The generator rejects every other key.
 */
export function fromDrupalFieldName(fieldName: string): string {
  return fieldName.replaceAll('__', '.')
}

export type ExtractionText = {
  type: 'text'
  fullKey: string
  key: string
  context?: string
  defaultText?: string
  filePath: string
}

export type ExtractionPlural = {
  type: 'plural'
  key: string
  fullKey: string
  context?: string
  singular: string
  plural: string
  filePath: string
}

export type Extraction = ExtractionText | ExtractionPlural

export type BuiltInGeneratorMethod = 'drupal-graphql-texts' | 'json'

export type EasyTextsGenerator = {
  /**
   * The path (relative to the Nuxt root) where the generated output should be saved.
   */
  outputPath: string

  /**
   * Generate the file.
   *
   * It receives a single argument that contains all found extractions.
   */
  generate: ((extractions: Extraction[]) => string) | BuiltInGeneratorMethod
}

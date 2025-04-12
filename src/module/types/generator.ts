import type { Extraction } from './extraction'

export type BuiltInGeneratorMethod = 'drupal-graphql-texts' | 'json'

export type GeneratorCallback = (
  extractions: Map<string, Extraction>,
) => string | Promise<string>

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
  generate: GeneratorCallback | BuiltInGeneratorMethod
}

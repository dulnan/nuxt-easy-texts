import type { EasyTextsLoader } from './types'

/**
 * Define the texts loader.
 *
 * This method should load the correct texts as an object.
 */
export function defineEasyTextsLoader(
  cb: () => EasyTextsLoader,
): () => EasyTextsLoader {
  return cb
}

import type {
  EasyTextsLoaderCallback,
  EasyTextsLoader,
  EasyTextsLoaderOptions,
} from './runtime/types'

/**
 * Define the texts loader.
 *
 * This method should load the correct texts as an object.
 */
export function defineEasyTextsLoader(
  getLoader: () => EasyTextsLoaderCallback,
  options: EasyTextsLoaderOptions = {},
): EasyTextsLoader {
  return { getLoader, options }
}

import type { Replacements, TextsState } from '../types'
import { toDebug } from './debug'

/**
 * Insert the count into a plural text.
 *
 * Replacement values are passed as functions: a string replacement would
 * interpret `$&`, `` $` ``, `$'` and `$$` in the value as patterns.
 */
function replaceCount(
  text: string,
  count: number | string | null | undefined,
): string {
  return text.replace('@count', () => (count || 0).toString())
}

function replace(text: string, replacements?: Replacements): string {
  if (!replacements) {
    return text
  }

  let replaced = text

  for (const [search, value] of Object.entries(replacements)) {
    // A function, so that the value is inserted literally (see replaceCount).
    replaced = replaced.replaceAll(search, () => value.toString())
  }

  return replaced
}

export function getSingleText(
  key: string,
  isDebug: boolean,
  texts: TextsState | null,
  replacements?: Replacements,
  defaultText?: string,
): string {
  if (texts) {
    const candidate = texts[key]
    if (typeof candidate === 'string') {
      return toDebug(key, replace(candidate, replacements), isDebug)
    } else if (Array.isArray(candidate) && candidate[0]) {
      return toDebug(key, replace(candidate[0], replacements), isDebug)
    }
  }

  // Dev fallback: render the default text when the translation isn't loaded
  // yet. This matters most after HMR adds a new call — the loader hasn't
  // re-collected the new key yet, but we want to show the default rather
  // than a raw key. In production the vite plugin strips the default at
  // compile time, so this whole branch is tree-shaken via import.meta.dev.
  if (import.meta.dev && defaultText !== undefined) {
    return toDebug(key, replace(defaultText, replacements), isDebug)
  }

  return key
}

export function getPluralTexts(
  key: string,
  count: number | string | null | undefined,
  isDebug: boolean,
  texts: TextsState | null,
  replacements?: Replacements,
  singular?: string,
  plural?: string,
): string {
  if (texts) {
    const candidate = texts[key]
    if (Array.isArray(candidate) && candidate.length === 2) {
      const text =
        count === 1 || count === '1'
          ? candidate[0]!
          : replaceCount(candidate[1]!, count)
      return toDebug(key, replace(text, replacements), isDebug)
    }
  }

  // Dev fallback: see getSingleText. Only kicks in when both forms are
  // available (i.e. the call is untransformed). Tree-shaken in production.
  if (import.meta.dev && singular !== undefined && plural !== undefined) {
    const text =
      count === 1 || count === '1' ? singular : replaceCount(plural, count)
    return toDebug(key, replace(text, replacements), isDebug)
  }

  return key
}

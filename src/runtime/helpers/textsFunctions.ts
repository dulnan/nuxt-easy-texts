import type { Replacements, TextsState } from '../types'
import { toDebug } from './debug'

function escapeRegExp(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace the placeholders in a text, in a single pass.
 *
 * - Every occurrence of a placeholder is replaced.
 * - A value is inserted as is and never searched again, so a value that
 *   contains another placeholder (e.g. a name "@city") stays unchanged.
 * - Longer placeholders are tried first, so "@countTotal" is not read as
 *   "@count" followed by "Total".
 * - The value is returned by a function: a string replacement would
 *   interpret `$&`, `` $` ``, `$'` and `$$` in the value as patterns.
 */
function replace(text: string, replacements?: Replacements): string {
  const searches = Object.keys(replacements || {}).filter(Boolean)
  if (!replacements || !searches.length) {
    return text
  }

  const pattern = new RegExp(
    searches
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|'),
    'g',
  )

  return text.replace(pattern, (search) => replacements[search]!.toString())
}

/**
 * Pick the singular or plural text for the count and replace its
 * placeholders. Both forms get @count, as in Drupal, where translators may
 * use it in the singular form too. An explicit @count replacement wins.
 */
function pluralize(
  singular: string,
  plural: string,
  count: number | string | null | undefined,
  replacements?: Replacements,
): string {
  const text = count === 1 || count === '1' ? singular : plural
  return replace(text, { '@count': count || 0, ...replacements })
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
      return toDebug(
        key,
        pluralize(candidate[0]!, candidate[1]!, count, replacements),
        isDebug,
      )
    }
  }

  // Dev fallback: see getSingleText. Only kicks in when both forms are
  // available (i.e. the call is untransformed). Tree-shaken in production.
  if (import.meta.dev && singular !== undefined && plural !== undefined) {
    return toDebug(
      key,
      pluralize(singular, plural, count, replacements),
      isDebug,
    )
  }

  return key
}

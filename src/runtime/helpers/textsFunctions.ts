import type { Replacements, TextsState } from '../types'
import { toDebug } from './debug'

function replace(text: string, replacements?: Replacements): string {
  if (!replacements) {
    return text
  }

  let replaced = text

  for (const [search, replace] of Object.entries(replacements)) {
    replaced = replaced.replaceAll(search, replace.toString())
  }

  return replaced
}

export function getSingleText(
  key: string,
  isDebug: boolean,
  texts: TextsState | null,
  replacements?: Replacements,
): string {
  if (texts) {
    const candidate = texts[key]
    if (typeof candidate === 'string') {
      return toDebug(key, replace(candidate, replacements), isDebug)
    } else if (Array.isArray(candidate) && candidate[0]) {
      return toDebug(key, replace(candidate[0], replacements), isDebug)
    }
  }

  return key
}

export function getPluralTexts(
  key: string,
  count: number | string | null | undefined,
  isDebug: boolean,
  texts: TextsState | null,
  replacements?: Replacements,
): string {
  if (texts) {
    const candidate = texts[key]
    if (Array.isArray(candidate) && candidate.length === 2) {
      const text =
        count === 1 || count === '1'
          ? candidate[0]!
          : candidate[1]!.replace('@count', (count || 0).toString())
      return toDebug(key, replace(text, replacements), isDebug)
    }
  }

  return key
}

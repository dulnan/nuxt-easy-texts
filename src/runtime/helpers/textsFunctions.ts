import type { TextsState } from '../types'

export function getSingleText(
  key: string,
  isDebug: boolean,
  texts: TextsState | null,
): string {
  if (texts && !isDebug) {
    const candidate = texts[key]
    if (typeof candidate === 'string') {
      return candidate
    } else if (Array.isArray(candidate)) {
      return candidate[0] || key
    }
  }

  return key
}

export function getPluralTexts(
  key: string,
  count: number | string | null | undefined,
  isDebug: boolean,
  texts: TextsState | null,
): string {
  if (texts && !isDebug) {
    const candidate = texts[key]
    if (Array.isArray(candidate) && candidate.length === 2) {
      return count === 1 || count === '1'
        ? candidate[0]!
        : candidate[1]!.replace('@count', (count || 0).toString())
    }
  }

  return key
}

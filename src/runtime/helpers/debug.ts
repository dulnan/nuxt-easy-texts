import { advancedDebugEnabled } from '#nuxt-easy-texts/settings'

// Invisible Separator - marks beginning of encoded key.
export const DEBUG_START = '\u2063'

// Word Joiner - marks end of encoded key.
export const DEBUG_END = '\u2060'

/**
 * Encodes the given string to be completely invisible using zero-width
 * Unicode characters. The result is completely invisible when rendered
 * but we can later decode it back to the original key.
 *
 * The key is encoded as UTF-8 bytes, 8 bits each, which is what
 * decodeInvisibleKeys() reads back. Encoding UTF-16 code units instead
 * breaks every key with a character above U+007F.
 */
export function encodeKeyToInvisible(key: string): string {
  const bits = Array.from(new TextEncoder().encode(key), (byte) =>
    byte.toString(2).padStart(8, '0'),
  ).join('')
  const encoded = bits.replace(/0/g, '\u200B').replace(/1/g, '\u200C')
  return DEBUG_START + encoded + DEBUG_END
}

/**
 * Decode all keys encoded with encodeKeyToInvisible() in the given text.
 */
export function decodeInvisibleKeys(text: string): string[] {
  const keys: string[] = []
  let index = 0

  while (index < text.length) {
    const start = text.indexOf(DEBUG_START, index)
    const end = text.indexOf(DEBUG_END, start + 1)
    if (start === -1 || end === -1 || end <= start) break

    const encoded = text
      .slice(start + 1, end)
      .replace(/\u200B/g, '0')
      .replace(/\u200C/g, '1')

    const bytes: number[] = []
    for (let i = 0; i < encoded.length; i += 8) {
      bytes.push(parseInt(encoded.slice(i, i + 8), 2))
    }

    keys.push(new TextDecoder().decode(new Uint8Array(bytes)))
    index = end + 1
  }

  return keys
}

/**
 * Encodes the key invivisbly in the resluting text in debug mode.
 */
export function toDebug(key: string, text: string, isDebug: boolean): string {
  if (isDebug) {
    if (advancedDebugEnabled) {
      const hiddenKey = encodeKeyToInvisible(key)
      return hiddenKey + text
    }
    return key
  }

  return text
}

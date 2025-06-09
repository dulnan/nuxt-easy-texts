import { advancedDebugEnabled } from '#nuxt-easy-texts/settings'

// Invisible Separator - marks beginning of encoded key.
export const DEBUG_START = '\u2063'

// Word Joiner - marks end of encoded key.
export const DEBUG_END = '\u2060'

/**
 * Encodes the given string to be completely invisible using zero-width
 * Unicode characters. The result is completely invisible when rendered
 * but we can later decode it back to the original key.
 */
export function encodeKeyToInvisible(key: string): string {
  const bits = [...key]
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('')
  const encoded = bits.replace(/0/g, '\u200B').replace(/1/g, '\u200C')
  return DEBUG_START + encoded + DEBUG_END
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

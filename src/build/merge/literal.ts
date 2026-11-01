import type { EscapeSequence } from './escapeRanges'

/**
 * Whether the character at the index is the one to escape in one of the
 * sequences.
 */
function isInSequence(
  text: string,
  index: number,
  sequences: EscapeSequence[],
): boolean {
  return sequences.some((sequence) => {
    const start = index - sequence.index
    return (
      start >= 0 &&
      text.slice(start, start + sequence.match.length).toLowerCase() ===
        sequence.match
    )
  })
}

/**
 * Writes a text as a string literal with the given quote character, so that
 * parsing the literal returns the text again.
 *
 * Characters in the given sequences are written as \x escapes, e.g. the "
 * in a template attribute as \x22. See getEscapeRanges().
 */
export function toStringLiteral(
  text: string,
  quote: string,
  sequences: EscapeSequence[] = [],
): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (char === '\\') {
      result += '\\\\'
    } else if (char === quote) {
      result += '\\' + quote
    } else if (isInSequence(text, i, sequences)) {
      result += '\\x' + char.charCodeAt(0).toString(16).padStart(2, '0')
    } else if (char === '\n') {
      result += '\\n'
    } else if (char === '\r') {
      result += '\\r'
    } else if (char === ' ' || char === ' ') {
      result += '\\u' + char.charCodeAt(0).toString(16)
    } else if (quote === '`' && char === '$' && text[i + 1] === '{') {
      result += '\\$'
    } else {
      result += char
    }
  }
  return quote + result + quote
}

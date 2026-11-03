import type { EscapeSequence } from './codeRanges'

/**
 * Escapes that are easier to read than a \x escape.
 */
const NAMED_ESCAPES: Record<string, string> = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
}

/**
 * Whether the character is invisible and shouldn't be written as it is: a
 * control character, a line or paragraph separator, or a character that
 * changes the direction of text, which can make code display differently
 * than it runs.
 */
export function isInvisible(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    code < 0x20 ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0x061c ||
    code === 0x200e ||
    code === 0x200f ||
    code === 0x2028 ||
    code === 0x2029 ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0xfeff
  )
}

/**
 * The \x or \u escape of a character.
 */
export function toEscape(char: string): string {
  const code = char.charCodeAt(0)
  return code <= 0xff
    ? '\\x' + code.toString(16).padStart(2, '0')
    : '\\u' + code.toString(16).padStart(4, '0')
}

/**
 * Writes a text as a string literal with the given quote character, so that
 * parsing the literal returns the text again.
 *
 * Characters in the given sequences are written as \x escapes, e.g. the "
 * in a template attribute as \x22. See getCodeRanges().
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
    } else if (sequences.some((sequence) => sequence(text, i))) {
      result += toEscape(char)
    } else if (isInvisible(char)) {
      result += NAMED_ESCAPES[char] ?? toEscape(char)
    } else if (quote === '`' && char === '$' && text[i + 1] === '{') {
      result += '\\$'
    } else {
      result += char
    }
  }
  return quote + result + quote
}

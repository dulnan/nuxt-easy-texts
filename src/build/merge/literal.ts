/**
 * Writes a text as a string literal with the given quote character, so that
 * parsing the literal returns the text again.
 *
 * The characters in hexChars are written as \x escapes. In a Vue template
 * attribute, e.g. :title="$texts('key', 'Text')", HTML ends the attribute at
 * the first quote that matches the attribute's quote, whatever JavaScript
 * escapes come before it. That quote is therefore written as \x22 or \x27.
 */
export function toStringLiteral(
  text: string,
  quote: string,
  hexChars = '',
): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (char === '\\') {
      result += '\\\\'
    } else if (char === quote) {
      result += '\\' + quote
    } else if (hexChars.includes(char)) {
      result += '\\x' + char.charCodeAt(0).toString(16)
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

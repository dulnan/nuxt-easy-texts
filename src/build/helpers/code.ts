import type { MethodCall } from '../types/extraction'

/**
 * Extract calls to the given method.
 *
 * The provided method should be the name of the method including the first
 * opening bracket, e.g. "$texts(".
 *
 * The return value is an array of all occurences of full calls to the
 * given method.
 */
export function extractMethodCalls(code: string, method: string): MethodCall[] {
  const methodCalls: MethodCall[] = []
  const methodLength = method.length
  let i = 0

  while (i < code.length) {
    const startIndex = code.indexOf(method, i)
    // No more occurrences.
    if (startIndex === -1) {
      break
    }

    let endIndex = startIndex + methodLength
    let openBrackets = 1

    // Keep track of the quotes.
    let inSingleQuote = false
    let inDoubleQuote = false
    let inTemplateLiteral = false

    while (endIndex < code.length && openBrackets > 0) {
      const char = code[endIndex]
      const prevChar = code[endIndex - 1]

      if (char === "'" && !inDoubleQuote && !inTemplateLiteral) {
        inSingleQuote = !inSingleQuote
      } else if (char === '"' && !inSingleQuote && !inTemplateLiteral) {
        inDoubleQuote = !inDoubleQuote
      } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inTemplateLiteral = !inTemplateLiteral
      }

      if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral) {
        if (char === '(') {
          openBrackets++
        } else if (char === ')') {
          openBrackets--
        }
      } else if (inTemplateLiteral && char === '$' && prevChar === '{') {
        // Handle nested expressions within template literals.
        openBrackets++
      } else if (inTemplateLiteral && char === '}' && prevChar === '}') {
        // Handle closing of nested expressions within template literals.
        openBrackets--
      }

      endIndex++
    }

    if (openBrackets === 0) {
      const callText = code.substring(startIndex, endIndex)
      methodCalls.push({
        code: callText,
        start: startIndex,
        end: endIndex,
      })
      // Move index to the end of the current method call.
      i = endIndex
    } else {
      throw new Error('Unmatched parentheses in the code.')
    }
  }

  return methodCalls
}

import type { MethodCall } from '../types/extraction'

/**
 * Files that can contain text calls: .vue and every JavaScript and TypeScript
 * flavour (.js, .mjs, .cjs, .jsx, .ts, .mts, .cts, .tsx).
 *
 * The vite plugin and the dev watcher must agree with what `pattern` can
 * collect: a scanned file whose default texts are not stripped reaches the
 * runtime in its dev shape, where the default text is read as the
 * replacements.
 */
export const SOURCE_FILE_REGEX = /\.(vue|[cm]?[jt]sx?)$/i

/**
 * The 1-based number of the line that contains the position: one more than
 * the line breaks before it.
 */
export function getLineNumber(code: string, position: number): number {
  return code.slice(0, position).split('\n').length
}

/**
 * Extract calls to the given method.
 *
 * The provided method should be the name of the method including the first
 * opening bracket, e.g. "$texts(".
 *
 * The return value is an array of all occurences of full calls to the
 * given method.
 *
 * An occurrence without a closing parenthesis (e.g. "$texts(" in a comment)
 * is passed to onUnmatched with its start index and skipped, and the search
 * continues after it. Without onUnmatched, it throws.
 */
export function extractMethodCalls(
  code: string,
  method: string,
  onUnmatched?: (start: number) => void,
): MethodCall[] {
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

    // Stack of the nested contexts we are currently inside. Entries are:
    //   "'" / '"'  a quoted string
    //   '`'        a template literal
    //   '{'        a brace scope - an object literal, or the inside of a
    //              template literal interpolation
    // A stack rather than a set of flags, because these nest arbitrarily: an
    // interpolation holds code, that code can hold another template literal,
    // and so on. Parentheses are only counted while not inside a string, so a
    // ")" in a text never ends the call early.
    const stack: string[] = []

    while (endIndex < code.length && openBrackets > 0) {
      const char = code[endIndex]
      const context = stack[stack.length - 1]

      if (context === "'" || context === '"' || context === '`') {
        // Inside a string a backslash escapes the next character, so consume
        // both. Without this, 'It\'s here' reads the escaped quote as the end
        // of the string and the scan runs on past the end of the call.
        if (char === '\\') {
          endIndex += 2
          continue
        }
        if (char === context) {
          stack.pop()
        } else if (
          context === '`' &&
          char === '$' &&
          code[endIndex + 1] === '{'
        ) {
          // Opening an interpolation: its contents are code, not text.
          stack.push('{')
          endIndex += 2
          continue
        }
      } else if (char === "'" || char === '"' || char === '`') {
        stack.push(char)
      } else if (char === '{') {
        stack.push('{')
      } else if (char === '}') {
        // Closes an object literal or an interpolation, returning us to
        // whatever context enclosed it.
        stack.pop()
      } else if (char === '(') {
        openBrackets++
      } else if (char === ')') {
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
    } else if (onUnmatched) {
      onUnmatched(startIndex)
      // Calls that follow were swallowed by the scan, so continue right
      // after the method name to find them.
      i = startIndex + methodLength
    } else {
      throw new Error('Unmatched parentheses in the code.')
    }
  }

  return methodCalls
}

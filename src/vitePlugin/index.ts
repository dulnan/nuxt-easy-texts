import type { Plugin } from 'vite'
import MagicString from 'magic-string'
import { generate } from 'astring'
import { getExpression } from '../module/helpers/ast'

const fileRegex = /\.(vue|js|ts|mjs)$/

/**
 * Extract calls to the given method.
 *
 * The provided method should be the name of the method including the first
 * opening bracket, e.g. "$texts(".
 *
 * The return value is an array of all occurences of full calls to the
 * given method.
 */
export function extractMethodCalls(code: string, method: string): string[] {
  const methodCalls: string[] = []
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
      methodCalls.push(code.substring(startIndex, endIndex))
      // Move index to the end of the current method call.
      i = endIndex
    } else {
      throw new Error('Unmatched parentheses in the code.')
    }
  }

  return methodCalls
}

export default function extractTexts(options: any = {}): Plugin {
  const isSourceMapEnabled =
    options.sourceMap !== false && options.sourcemap !== false

  return {
    name: 'nuxt-easy-texts:transform-file',

    transform(source, id) {
      if (!fileRegex.test(id)) {
        return
      }

      if (!source.includes('$texts(') || !source.includes('$textsPlural(')) {
        return
      }

      const magicString = new MagicString(source)
      extractMethodCalls(source, '$texts(').forEach((code) => {
        const tree = this.parse(code)
        if (tree) {
          const node = getExpression(tree)
          if (node) {
            node.arguments = [node.arguments[0]!]
            const processed = generate(node)
            magicString.replace(code, processed)
          }
        }
      })

      extractMethodCalls(source, '$textsPlural(').forEach((code) => {
        const tree = this.parse(code)
        if (tree) {
          const node = getExpression(tree)
          if (node) {
            // Only keep the first two arguments.
            // e.g. $textsPlural('context.key', count, '1 year', '@count years')
            // =>   $textsPlural('context.key', count)
            node.arguments = node.arguments.slice(0, 2)

            const processed = generate(node)
            magicString.replace(code, processed)
          }
        }
      })

      const result: Record<string, any> = { code: magicString.toString() }
      if (isSourceMapEnabled) {
        result.map = magicString.generateMap({ hires: true })
      }

      return result
    },
  }
}

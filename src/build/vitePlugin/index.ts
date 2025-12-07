import { createUnplugin } from 'unplugin'
import type { Nuxt } from '@nuxt/schema'
import type { Node, CallExpression } from 'estree'
import MagicString from 'magic-string'
import { generate } from 'astring'
import { extractMethodCalls } from '../helpers/code'

function getExpression(node: Node): CallExpression | undefined {
  if (node.type === 'Program') {
    const first = node.body[0]
    if (first?.type === 'ExpressionStatement') {
      const expression = first.expression
      if (expression?.type === 'CallExpression') {
        return expression
      }
    }
  }
}

type ParseFn = (code: string) => Node

/**
 * Transform source code by stripping default texts from $texts and $textsPlural calls.
 * Returns both the transformed code and the MagicString instance for sourcemap generation.
 * Exported for testing.
 */
export function transformTexts(
  source: string,
  parse: ParseFn,
): { code: string; magicString: MagicString } {
  const s = new MagicString(source)

  extractMethodCalls(source, '$texts(').forEach((call) => {
    const tree = parse(call.code)
    const node = getExpression(tree)
    if (node) {
      // Only keep the first argument (the key) and the third (replacements).
      const args = node.arguments
      node.arguments = [args[0]!]
      const replacements = args[2]
      if (replacements) {
        node.arguments.push(replacements)
      }
      const processed = generate(node)
      s.overwrite(call.start, call.end, processed)
    }
  })

  extractMethodCalls(source, '$textsPlural(').forEach((call) => {
    const tree = parse(call.code)
    const node = getExpression(tree)
    if (node) {
      // Only keep the first two arguments and the fifth (replacements).
      // e.g. $textsPlural('context.key', count, '1 year', '@count years', { '@name': name })
      // =>   $textsPlural('context.key', count, { '@name': name })
      const args = node.arguments
      node.arguments = args.slice(0, 2)
      const replacements = args[4]
      if (replacements) {
        node.arguments.push(replacements)
      }
      const processed = generate(node)
      s.overwrite(call.start, call.end, processed)
    }
  })

  return { code: s.toString(), magicString: s }
}

const fileRegex = /\.(vue|js|ts|mjs)$/

export default function extractTexts(nuxt: Nuxt) {
  return createUnplugin(() => {
    return {
      name: 'nuxt-easy-texts:transform-file',
      enforce: 'pre',

      transform(source, id) {
        const filePath = id.split('?')[0]
        if (
          !filePath ||
          !fileRegex.test(filePath) ||
          (!source.includes('$texts(') && !source.includes('$textsPlural('))
        ) {
          return
        }

        const { code, magicString } = transformTexts(
          source,
          (code) => this.parse(code) as Node,
        )

        if (code !== source) {
          return {
            code,
            map:
              nuxt.options.sourcemap.client || nuxt.options.sourcemap.server
                ? magicString.generateMap({ hires: true })
                : null,
          }
        }
      },
    }
  })
}

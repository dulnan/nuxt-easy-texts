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

const fileRegex = /\.(vue|js|ts|mjs)$/

export default function extractTexts(nuxt: Nuxt) {
  return createUnplugin(() => {
    return {
      name: 'nuxt-easy-texts:transform-file',

      transform(source, id) {
        const filePath = id.split('?')[0]
        if (
          !filePath ||
          !fileRegex.test(filePath) ||
          (!source.includes('$texts(') && !source.includes('$textsPlural('))
        ) {
          return
        }

        const s = new MagicString(source)
        extractMethodCalls(source, '$texts(').forEach((call) => {
          const tree = this.parse(call.code) as Node
          const node = getExpression(tree)
          if (node) {
            // Only keep the first argument (the key).
            node.arguments = [node.arguments[0]!]
            const processed = generate(node)
            s.replace(call.code, processed)
          }
        })

        extractMethodCalls(source, '$textsPlural(').forEach((call) => {
          const tree = this.parse(call.code) as Node
          const node = getExpression(tree)
          if (node) {
            // Only keep the first two arguments.
            // e.g. $textsPlural('context.key', count, '1 year', '@count years')
            // =>   $textsPlural('context.key', count)
            node.arguments = node.arguments.slice(0, 2)
            const processed = generate(node)
            s.replace(call.code, processed)
          }
        })

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map:
              nuxt.options.sourcemap.client || nuxt.options.sourcemap.server
                ? s.generateMap({ hires: true })
                : null,
          }
        }
      },
    }
  })
}

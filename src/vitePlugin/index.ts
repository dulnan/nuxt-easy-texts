import type { Plugin } from 'vite'
import MagicString from 'magic-string'
import { generate } from 'astring'
import { getExpression } from '../Extractor'

const fileRegex = /\.(vue|js|ts|mjs)$/
export const RGX_TEXTS = /(\$texts\((.+?)\))/gms
export const RGX_TEXTS_PLURAL = /(\$textsPlural\((.+?)\))/gms

export default function extractTexts(options: any = {}): Plugin {
  const isSourceMapEnabled =
    options.sourceMap !== false && options.sourcemap !== false

  return {
    name: 'transform-file',

    transform(source, id) {
      if (!fileRegex.test(id)) {
        return
      }

      if (!source.includes('$texts(') || !source.includes('$textsPlural(')) {
        return
      }

      const magicString = new MagicString(source)
      const matches = [...source.matchAll(RGX_TEXTS)]
      matches.forEach((match) => {
        const code = match[0]
        const tree = this.parse(code)
        if (tree) {
          const node = getExpression(tree)
          node.arguments = [node.arguments[0]]

          const processed = generate(node)
          magicString.replace(code, processed)
        }
      })
      ;[...source.matchAll(RGX_TEXTS_PLURAL)].forEach((match) => {
        const code = match[0]
        const tree = this.parse(code)
        if (tree) {
          const node = getExpression(tree)
          console.log(code)
          // Only keep the first two arguments.
          // e.g. $textsPlural('context.key', count, '1 year', '@count years')
          // =>   $textsPlural('context.key', count)
          node.arguments = node.arguments.slice(0, 2)

          const processed = generate(node)
          magicString.replace(code, processed)
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

import { createUnplugin } from 'unplugin'
import type { Nuxt } from '@nuxt/schema'
import type { Node, CallExpression } from 'estree'
import MagicString from 'magic-string'
import { generate } from 'astring'
import { extractMethodCalls, SOURCE_FILE_REGEX } from '../helpers/code'
import { isDefaultTextArgument } from '../helpers/ast'

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
      // The transform may run more than once on the same source (e.g. once on
      // a parent .vue file and again on its ?vue&type=script sub-module), so
      // only transform while a default text is still present in 2nd position.
      //
      // isDefaultTextArgument() accepts exactly what the collector accepts as
      // a default text: a string literal, a template literal or an explicitly
      // empty value. Anything else in that position - most importantly the
      // replacements object, which shifts left once the defaults have been
      // stripped - means the call is already transformed. Testing for "is a
      // default text" rather than "is not a Literal" matters: the latter also
      // rejects template literal defaults, which then never get stripped and
      // reach the runtime in their dev shape, where the production signature
      // ($texts(key, replacements)) reads the default text as the
      // replacements and drops the real ones.
      const args = node.arguments
      if (!isDefaultTextArgument(args[1])) {
        return
      }
      // Only keep the first argument (the key) and the third (replacements).
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
      // See note above: the singular default sits in 3rd position, so only
      // transform while one is still there.
      const args = node.arguments
      if (!isDefaultTextArgument(args[2])) {
        return
      }
      // Only keep the first two arguments and the fifth (replacements).
      // e.g. $textsPlural('context.key', count, '1 year', '@count years', { '@name': name })
      // =>   $textsPlural('context.key', count, { '@name': name })
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

export default function extractTexts(nuxt: Nuxt) {
  return createUnplugin(() => {
    return {
      name: 'nuxt-easy-texts:transform-file',
      enforce: 'pre',

      transform(source, id) {
        const filePath = id.split('?')[0]
        if (
          !filePath ||
          !SOURCE_FILE_REGEX.test(filePath) ||
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

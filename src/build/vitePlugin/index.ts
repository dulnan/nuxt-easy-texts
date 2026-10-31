import { createUnplugin } from 'unplugin'
import type { Nuxt } from '@nuxt/schema'
import type { Node, CallExpression } from 'estree'
import MagicString from 'magic-string'
import { generate } from 'astring'
import { relative } from 'pathe'
import { extractMethodCalls, SOURCE_FILE_REGEX } from '../helpers/code'
import { extractLiteral, isDefaultTextArgument } from '../helpers/ast'
import { logger } from '../helpers'

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

/**
 * The key of the call, unless it is only known at runtime.
 */
function getStaticKey(node: CallExpression): string | undefined {
  try {
    return extractLiteral(node.arguments[0], 'key')
  } catch {
    // An interpolated template literal.
    return undefined
  }
}

type ParseFn = (code: string) => Node

/**
 * Transform source code by stripping default texts from $texts and $textsPlural calls.
 * Returns both the transformed code and the MagicString instance for sourcemap generation.
 * Exported for testing.
 *
 * onKey receives the key of every call whose key is a literal, whether or not
 * the call is transformed.
 */
export function transformTexts(
  source: string,
  parse: ParseFn,
  onKey?: (key: string) => void,
): { code: string; magicString: MagicString } {
  const s = new MagicString(source)

  const reportKey = (node: CallExpression) => {
    const key = getStaticKey(node)
    if (onKey && key !== undefined) {
      onKey(key)
    }
  }

  extractMethodCalls(source, '$texts(').forEach((call) => {
    const tree = parse(call.code)
    const node = getExpression(tree)
    if (node) {
      reportKey(node)

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
      reportKey(node)

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

/**
 * @param nuxt - The Nuxt instance.
 * @param isKnownKey - Whether the collector extracted the key.
 */
export default function extractTexts(
  nuxt: Nuxt,
  isKnownKey: (key: string) => boolean,
) {
  // The client and the server build both run the plugin, so remember what
  // was already reported.
  const reported = new Set<string>()

  /**
   * Warn about a key that was not extracted.
   *
   * The plugin strips default texts from every file, but the collector only
   * scans files matching the pattern. A key used only in other files is
   * missing from the generated output, so a loader based on it never loads
   * the text and production shows the key. In dev, the default text fallback
   * hides this.
   */
  const warnUnknownKey = (key: string, filePath: string) => {
    const id = key + '\0' + filePath
    if (isKnownKey(key) || reported.has(id)) {
      return
    }
    reported.add(id)
    logger.warn(
      `Text key "${key}" in ${relative(nuxt.options.rootDir, filePath)} was not extracted, because the file is not matched by easyTexts.pattern. Its text may render as the key in production. Add the file to the pattern or the key to easyTexts.globalTexts.`,
    )
  }

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
          (key) => warnUnknownKey(key, filePath),
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

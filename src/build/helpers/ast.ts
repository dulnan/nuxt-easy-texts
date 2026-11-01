import type { Program } from 'acorn'
import type { BaseCallExpression, Expression, SpreadElement } from 'estree'
import type {
  ExtractionPlural,
  ExtractionText,
  MethodCall,
} from '../types/extraction'

export function getExpression(
  program: Program,
): BaseCallExpression | undefined {
  const first = program.body[0]
  if (first && 'expression' in first) {
    return first.expression as BaseCallExpression
  }
}

/**
 * Whether the argument may stand in a default text position.
 *
 * That is a string literal, a template literal, or an explicitly empty value
 * (undefined, null or void 0), which passes replacements without a default
 * text: $texts('key', undefined, { '@name': name }).
 *
 * The collector rejects anything else there, and the vite plugin strips
 * exactly these. Production calls have no default text, so a variable left in
 * that position would be read as the replacements.
 */
export function isDefaultTextArgument(
  node: Expression | SpreadElement | undefined,
): boolean {
  if (!node) {
    return false
  }
  switch (node.type) {
    case 'TemplateLiteral':
      return true
    case 'Literal':
      return typeof node.value === 'string' || node.raw === 'null'
    case 'Identifier':
      return node.name === 'undefined'
    case 'UnaryExpression':
      return node.operator === 'void'
    default:
      return false
  }
}

export function extractLiteral(
  literal: Expression | SpreadElement | undefined,
  argument: string,
  throwError = false,
): string | undefined {
  if (literal && literal.type === 'Literal') {
    if (literal.value && typeof literal.value === 'string') {
      return literal.value
    }
  } else if (literal && literal.type === 'TemplateLiteral') {
    // Only the first quasi is ever read, so an interpolated template literal
    // would silently extract as the text before the first placeholder. That
    // truncated string becomes the extracted text and ends up in the generator
    // output, so reject it instead of quietly losing half the sentence.
    //
    // This throws regardless of throwError: a wrong value is worse than a
    // missing one, and the caller can't tell the two apart.
    if (literal.expressions.length) {
      throw new Error(
        `Interpolated template literals can't be used for the "${argument}" argument, only the text before the first placeholder would be extracted. Use a static string and pass dynamic values via the replacements argument.`,
      )
    }
    // The cooked value is the string the code produces, with escapes like
    // € or \` resolved, as for a string literal's value. The raw value is
    // the source text. Cooked is only null for invalid escapes, which are a
    // syntax error outside of tagged templates.
    return literal.quasis[0]?.value.cooked ?? undefined
  }
  if (throwError) {
    if (literal) {
      if (literal.type !== 'Literal') {
        throw new Error("Variables can't be used as arguments.")
      } else if (typeof literal.value !== 'string') {
        throw new TypeError('Only strings can be used as arguments.')
      }
    }
    throw new Error(`Failed to extract value for argument "${argument}".`)
  }
}

/**
 * Split a full key into its context and key.
 *
 * The context is the part before the first dot, the key is everything after
 * it, so further dots stay in the key:
 * - 'search'           => key 'search'
 * - 'global.homepage'  => context 'global', key 'homepage'
 * - 'cart.items.title' => context 'cart', key 'items.title'
 */
export function parseKey(v: string): { key: string; context?: string } {
  const [context, ...rest] = v.split('.')
  const key = rest.join('.')

  // No dot, or nothing after it.
  if (!key) {
    return {
      key: context!,
    }
  }
  return {
    key,
    context,
  }
}

export function extractPlural(
  program: Program,
  filePath: string,
  call: MethodCall,
): ExtractionPlural | undefined {
  const node = getExpression(program)
  if (!node) {
    return
  }

  const fullKey = extractLiteral(node.arguments[0], 'key', true)

  // A call with only key and count reuses texts defined elsewhere (another
  // call or globalTexts). The collector reports a missing default if there
  // is none. Once a singular text is given, both texts are required.
  const hasDefaults = node.arguments.length > 2
  const singular = hasDefaults
    ? extractLiteral(node.arguments[2], 'singular', true)
    : ''
  const plural = hasDefaults
    ? extractLiteral(node.arguments[3], 'plural', true)
    : ''

  if (fullKey && singular !== undefined && plural !== undefined) {
    const { key, context } = parseKey(fullKey)
    return {
      type: 'plural',
      fullKey,
      key,
      context,
      singular,
      plural,
      filePath,
      call,
    }
  }
}

export function extractSingle(
  program: Program,
  filePath: string,
  call: MethodCall,
): ExtractionText | undefined {
  const node = getExpression(program)
  if (!node) {
    return
  }

  const fullKey = extractLiteral(node.arguments[0], 'key', true)
  const defaultArgument = node.arguments[1]
  if (defaultArgument && !isDefaultTextArgument(defaultArgument)) {
    throw new Error(
      'Only a string can be used as the "defaultText" argument. To pass replacements without a default text, use undefined in its place.',
    )
  }
  const defaultText = extractLiteral(defaultArgument, 'defaultText')

  if (fullKey) {
    const { key, context } = parseKey(fullKey)
    return {
      type: 'text',
      fullKey,
      key,
      context,
      defaultText,
      filePath,
      call,
    }
  }
}

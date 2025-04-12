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
    return literal.quasis[0]?.value.raw
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

export function parseKey(v: string): { key: string; context?: string } {
  // e.g. 'global.homepage'
  // ['global', 'homepage']
  const [a, b] = v.split('.', 2)

  // e.g. 'search'
  // ['search', undefined]
  if (!b) {
    return {
      key: a!,
    }
  }
  return {
    key: b,
    context: a,
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
  const singular = extractLiteral(node.arguments[2], 'singular', true)
  const plural = extractLiteral(node.arguments[3], 'plural', true)

  if (fullKey && singular && plural) {
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
  const defaultText = extractLiteral(node.arguments[1], 'defaultText')

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

import { parse } from 'acorn'
import MagicString from 'magic-string'
import type { Expression, SpreadElement } from 'estree'
import { extractMethodCalls } from '../helpers/code'
import { extractLiteral, getExpression } from '../helpers/ast'
import type { MethodCall } from '../types/extraction'
import { toStringLiteral } from './literal'
import { getVueQuoteRanges } from './vueQuotes'

/**
 * The texts of one language, in the shape a loader returns.
 */
export type LiveTexts = Record<string, string | string[]>

export type MergeChange = {
  fullKey: string
  line: number
  before: string
  after: string
}

export type MergeFileResult = {
  /**
   * The new file contents, or null if nothing changed.
   */
  code: string | null
  changes: MergeChange[]

  /**
   * Keys that have a default text in this file but no live text.
   */
  missing: string[]
}

type ArgumentNode = (Expression | SpreadElement) & {
  start: number
  end: number
}

/**
 * The live text for the key. Only own properties count, so that a key like
 * "constructor" doesn't find the object's prototype.
 */
function getLiveText(
  texts: LiveTexts,
  fullKey: string,
): string | string[] | undefined {
  return Object.hasOwn(texts, fullKey) ? texts[fullKey] : undefined
}

/**
 * Whether the argument is a default text that can be replaced: a string
 * literal or a template literal without placeholders.
 */
function isStaticText(node: Expression | SpreadElement | undefined): boolean {
  if (!node) {
    return false
  }
  if (node.type === 'Literal') {
    return typeof node.value === 'string' && node.value !== ''
  }
  return node.type === 'TemplateLiteral' && node.expressions.length === 0
}

/**
 * Replaces the default texts in a file with the given live texts.
 *
 * Only string and template literals in the default text positions are
 * replaced. Calls without a default text and calls the collector rejects are
 * left alone.
 */
export function mergeFile(
  filePath: string,
  code: string,
  texts: LiveTexts,
): MergeFileResult {
  const output = new MagicString(code)
  const changes: MergeChange[] = []
  const missing = new Set<string>()
  const quoteRanges = filePath.endsWith('.vue') ? getVueQuoteRanges(code) : []

  const getLine = (position: number) =>
    code.slice(0, position).split('\n').length

  const replace = (
    call: MethodCall,
    node: ArgumentNode,
    text: string,
  ): boolean => {
    const before = extractLiteral(node, 'text')
    if (before === text) {
      return false
    }
    const start = call.start + node.start
    const end = call.start + node.end
    const hexChars = quoteRanges.find(
      (range) => range.start <= start && end <= range.end,
    )?.quotes
    output.overwrite(start, end, toStringLiteral(text, code[start]!, hexChars))
    return true
  }

  const parseCall = (call: MethodCall) => {
    try {
      return getExpression(parse(call.code, { ecmaVersion: 'latest' }))
    } catch {
      // The collector reports calls it can't parse.
      return undefined
    }
  }

  for (const call of extractMethodCalls(code, '$texts(', () => {})) {
    const node = parseCall(call)
    const keyNode = node?.arguments[0]
    const defaultNode = node?.arguments[1]
    if (!keyNode || !isStaticText(keyNode) || !isStaticText(defaultNode)) {
      continue
    }
    const fullKey = extractLiteral(keyNode, 'key')!
    const live = getLiveText(texts, fullKey)
    if (live === undefined) {
      missing.add(fullKey)
      continue
    }
    if (typeof live !== 'string' || !live) {
      continue
    }
    const before = extractLiteral(defaultNode, 'defaultText')!
    if (replace(call, defaultNode as ArgumentNode, live)) {
      changes.push({ fullKey, line: getLine(call.start), before, after: live })
    }
  }

  for (const call of extractMethodCalls(code, '$textsPlural(', () => {})) {
    const node = parseCall(call)
    const keyNode = node?.arguments[0]
    const singularNode = node?.arguments[2]
    const pluralNode = node?.arguments[3]
    if (
      !keyNode ||
      !isStaticText(keyNode) ||
      !isStaticText(singularNode) ||
      !isStaticText(pluralNode)
    ) {
      continue
    }
    const fullKey = extractLiteral(keyNode, 'key')!
    const live = getLiveText(texts, fullKey)
    if (live === undefined) {
      missing.add(fullKey)
      continue
    }
    const [singular, plural] = Array.isArray(live) ? live : []
    if (!singular || !plural) {
      continue
    }
    const before = [
      extractLiteral(singularNode, 'singular')!,
      extractLiteral(pluralNode, 'plural')!,
    ]
    const changedSingular = replace(
      call,
      singularNode as ArgumentNode,
      singular,
    )
    const changedPlural = replace(call, pluralNode as ArgumentNode, plural)
    if (changedSingular || changedPlural) {
      changes.push({
        fullKey,
        line: getLine(call.start),
        before: before.join(' | '),
        after: `${singular} | ${plural}`,
      })
    }
  }

  return {
    code: output.hasChanged() ? output.toString() : null,
    changes,
    missing: [...missing],
  }
}

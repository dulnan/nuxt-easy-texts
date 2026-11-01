import { parse } from 'acorn'
import MagicString from 'magic-string'
import type { Expression, SpreadElement } from 'estree'
import { extractMethodCalls, getLineNumber } from '../helpers/code'
import {
  extractLiteral,
  getExpression,
  isDefaultTextArgument,
} from '../helpers/ast'
import type { MethodCall } from '../types/extraction'
import { toStringLiteral } from './literal'
import { getEscapeRanges } from './escapeRanges'

/**
 * The texts of one language, in the shape a loader returns.
 */
export type LiveTexts = Record<string, unknown>

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

  /**
   * Keys whose live text can't be used: not a non-empty string for $texts,
   * not two non-empty strings for $textsPlural.
   */
  invalid: string[]
}

type ArgumentNode = (Expression | SpreadElement) & {
  start: number
  end: number
}

/**
 * The text of a key or default text argument, as the collector reads it, or
 * undefined if there is none the merge can replace.
 *
 * The collector treats an empty text like a missing one, so does the merge.
 */
function getText(
  node: Expression | SpreadElement | undefined,
): string | undefined {
  if (!isDefaultTextArgument(node)) {
    return undefined
  }
  try {
    return extractLiteral(node, 'text') || undefined
  } catch {
    // An interpolated template literal, which the collector rejects.
    return undefined
  }
}

/**
 * The live texts for a call: one text for $texts, singular and plural for
 * $textsPlural. Null if the live text has the wrong shape.
 */
function getLiveTexts(live: unknown, count: number): string[] | null {
  const texts = count === 1 ? [live] : live
  if (
    Array.isArray(texts) &&
    texts.length === count &&
    texts.every((text) => typeof text === 'string' && text !== '')
  ) {
    return texts
  }
  return null
}

/**
 * Replaces the default texts in a file with the given live texts.
 *
 * A call is merged only if the collector reads a default text from it, so
 * calls without one, and calls the collector rejects, are left alone.
 */
export function mergeFile(
  filePath: string,
  code: string,
  texts: LiveTexts,
): MergeFileResult {
  const result: MergeFileResult = {
    code: null,
    changes: [],
    missing: [],
    invalid: [],
  }
  if (!code.includes('$texts(') && !code.includes('$textsPlural(')) {
    return result
  }

  const output = new MagicString(code)
  const missing = new Set<string>()
  const invalid = new Set<string>()
  const escapeRanges = getEscapeRanges(filePath, code)

  /**
   * Merges one call. The text arguments are the default text of $texts, or
   * the singular and plural of $textsPlural.
   */
  const mergeCall = (call: MethodCall, textArguments: number[]) => {
    let node
    try {
      node = getExpression(parse(call.code, { ecmaVersion: 'latest' }))
    } catch {
      // The collector reports calls it can't parse.
      return
    }
    const fullKey = getText(node?.arguments[0])
    const textNodes = textArguments.map((index) => node?.arguments[index])
    const before = textNodes.map(getText)
    if (!fullKey || before.some((text) => text === undefined)) {
      return
    }

    if (!Object.hasOwn(texts, fullKey)) {
      missing.add(fullKey)
      return
    }
    const after = getLiveTexts(texts[fullKey], textArguments.length)
    if (!after) {
      invalid.add(fullKey)
      return
    }
    if (after.every((text, i) => text === before[i])) {
      return
    }

    textNodes.forEach((textNode, i) => {
      const start = call.start + (textNode as ArgumentNode).start
      const end = call.start + (textNode as ArgumentNode).end
      const sequences = escapeRanges.find(
        (range) => range.start <= start && end <= range.end,
      )?.sequences
      output.overwrite(
        start,
        end,
        toStringLiteral(after[i]!, code[start]!, sequences),
      )
    })
    result.changes.push({
      fullKey,
      line: getLineNumber(code, call.start),
      before: before.join(' | '),
      after: after.join(' | '),
    })
  }

  for (const call of extractMethodCalls(code, '$texts(', () => {})) {
    mergeCall(call, [1])
  }
  for (const call of extractMethodCalls(code, '$textsPlural(', () => {})) {
    mergeCall(call, [2, 3])
  }

  result.code = output.hasChanged() ? output.toString() : null
  result.missing = [...missing]
  result.invalid = [...invalid]
  return result
}

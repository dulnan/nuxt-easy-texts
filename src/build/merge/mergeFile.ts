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
import { getCodeRanges } from './codeRanges'

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

/**
 * A call that is not code, e.g. in a comment.
 */
export type MergeSkip = {
  fullKey: string
  line: number
}

/**
 * A merged call, by the position of its method name.
 */
export type MergedCall = {
  fullKey: string
  line: number
  start: number

  /**
   * The indexes of the text arguments, and their texts.
   */
  textArguments: number[]
  texts: string[]
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

  /**
   * Calls whose default texts differ from the live texts, but which are not
   * code, e.g. in a comment or in the text of a template, so they are left
   * alone. Writing a text there could end the comment and add code.
   */
  skipped: MergeSkip[]
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
 * Returns the first merged call that the merged code doesn't read back as
 * written: Vue, or JavaScript in other files, doesn't find the call at its
 * position, or reads other texts from it. A mistake in the escaping shows up
 * here, e.g. a text that ends the template attribute around it, or that Vue
 * decodes.
 *
 * The ranges are read from Vue's own parse of the merged file, and only
 * include template expressions in which Vue decodes nothing, so that Vue
 * compiles the code as it is read here.
 */
export function findMisreadCall(
  filePath: string,
  code: string,
  calls: MergedCall[],
): MergedCall | undefined {
  const ranges = getCodeRanges(filePath, code)
  return calls.find((call) => {
    const args = ranges
      .find((range) => range.calls.has(call.start))
      ?.calls.get(call.start)
    return (
      !args ||
      call.textArguments.some((index, i) => args[index]?.text !== call.texts[i])
    )
  })
}

/**
 * Replaces the default texts in a file with the given live texts.
 *
 * A call is merged only if the collector reads a default text from it, so
 * calls without one, and calls the collector rejects, are left alone. So are
 * calls that are not code, see getCodeRanges().
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
    skipped: [],
  }
  if (!code.includes('$texts(') && !code.includes('$textsPlural(')) {
    return result
  }

  const output = new MagicString(code)
  const missing = new Set<string>()
  const invalid = new Set<string>()
  const codeRanges = getCodeRanges(filePath, code)
  const merged: MergedCall[] = []
  const overwrites: { start: number; end: number; length: number }[] = []

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

    const line = getLineNumber(code, call.start)
    const positions = textNodes.map((node) => ({
      start: call.start + (node as ArgumentNode).start,
      end: call.start + (node as ArgumentNode).end,
    }))
    // Only overwrite literals that are arguments of a call in code, at the
    // same positions as read here.
    const range = codeRanges.find((range) => range.calls.has(call.start))
    const args = range?.calls.get(call.start)
    const isCode = positions.every(
      ({ start, end }, i) =>
        args?.[textArguments[i]!]?.start === start &&
        args[textArguments[i]!]?.end === end,
    )
    if (!range || !isCode) {
      result.skipped.push({ fullKey, line })
      return
    }

    positions.forEach(({ start, end }, i) => {
      const literal = toStringLiteral(after[i]!, code[start]!, range.sequences)
      output.overwrite(start, end, literal)
      overwrites.push({ start, end, length: literal.length })
    })
    merged.push({
      fullKey,
      line,
      start: call.start,
      textArguments,
      texts: after,
    })
    result.changes.push({
      fullKey,
      line,
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

  if (output.hasChanged()) {
    result.code = output.toString()
    // The position of a call in the merged code: the literals before it
    // changed their length.
    const toMergedPosition = (position: number) =>
      overwrites
        .filter(({ end }) => end <= position)
        .reduce(
          (sum, { start, end, length }) => sum + length - (end - start),
          position,
        )
    const misread = findMisreadCall(
      filePath,
      result.code,
      merged.map((call) => ({ ...call, start: toMergedPosition(call.start) })),
    )
    if (misread) {
      throw new Error(
        `The merged text of "${misread.fullKey}" on line ${misread.line} would not be read back as written, so the file can't be merged. Please report this as a bug of nuxt-easy-texts.`,
      )
    }
  }
  result.missing = [...missing]
  result.invalid = [...invalid]
  return result
}

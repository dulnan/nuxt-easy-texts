import { promises as fs } from 'node:fs'
import type { Expression, SpreadElement } from 'estree'
import { parse } from 'acorn'
import type {
  Extraction,
  ExtractionPlural,
  ExtractionText,
} from '../types/extraction'
import { extractMethodCalls } from '../../vitePlugin'
import type { Cache } from './Cache'
import { getExpression } from '../helpers/ast'

function extractLiteral(
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

function extractPlural(
  program: any,
  filePath: string,
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
    return { fullKey, key, context, singular, plural, type: 'plural', filePath }
  }
}

function extractSingle(
  program: any,
  filePath: string,
): ExtractionText | undefined {
  const node = getExpression(program)
  if (!node) {
    return
  }

  const fullKey = extractLiteral(node.arguments[0], 'key', true)
  const defaultText = extractLiteral(node.arguments[1], 'defaultText', true)

  if (fullKey) {
    const { key, context } = parseKey(fullKey)
    return { fullKey, key, context, defaultText, type: 'text', filePath }
  }
}

export type ExtractionError = {
  source: string
  message: string
  filePath: string
}

export class CollectedFile {
  filePath: string
  fileContents: string
  extractions: Extraction[] = []
  errors: ExtractionError[] = []

  constructor(
    private cache: Cache,
    filePath: string,
    fileContents: string,
  ) {
    this.filePath = filePath
    this.fileContents = fileContents
    this.buildExtractions()
  }

  static async fromFilePath(
    cache: Cache,
    filePath: string,
  ): Promise<CollectedFile | null> {
    const content = (await fs.readFile(filePath)).toString()
    if (!content) {
      return null
    }
    return new CollectedFile(cache, filePath, content)
  }

  async update(): Promise<boolean> {
    const newContents = (await fs.readFile(this.filePath)).toString()

    // If contents are identical, return.
    if (newContents === this.fileContents) {
      return false
    }

    this.fileContents = newContents
    this.buildExtractions()
    return true
  }

  handleError(e: any, source: string) {
    const message =
      typeof e === 'object' && e !== null
        ? e.message
        : 'Failed to parse text arguments.'

    this.errors.push({ message, source, filePath: this.filePath })
  }

  /**
   * Find all possible extractions from the given source.
   */
  private buildExtractions() {
    this.extractions = []
    this.errors = []

    if (this.fileContents.includes('$texts(')) {
      this.extract('$texts(', this.cache.singleCache, extractSingle)
    }
    if (this.fileContents.includes('$textsPlural(')) {
      this.extract('$textsPlural(', this.cache.pluralCache, extractPlural)
    }
  }

  /**
   * Extract the single text method calls.
   */
  extract<T extends Extraction>(
    name: string,
    cache: Map<string, T>,
    method: (program: any, filePath: string) => T | undefined,
  ) {
    const calls = extractMethodCalls(this.fileContents, name)
    for (const source of calls) {
      const cached = cache.get(source)
      if (cached) {
        this.extractions.push(cached)
        continue
      }

      try {
        const tree = parse(source, {
          ecmaVersion: 'latest',
        })

        const result = method(tree, this.filePath)
        if (result) {
          cache.set(source, result)
          this.extractions.push(result)
        }
      } catch (e) {
        this.handleError(e, source)
      }
    }
  }
}

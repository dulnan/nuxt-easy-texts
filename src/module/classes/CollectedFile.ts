import { promises as fs } from 'node:fs'
import type { Expression, SpreadElement } from 'estree'
import { parse } from 'acorn'
import type {
  Extraction,
  ExtractionPlural,
  ExtractionText,
} from '../types/extraction'
import { extractMethodCalls } from '../../vitePlugin'
import { falsy, logger } from '../helpers'
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

function extract(program: any, filePath: string): ExtractionText | undefined {
  const node = getExpression(program)
  if (!node) {
    return
  }

  const fullKey = extractLiteral(node.arguments[0], 'key', true)
  const defaultText = extractLiteral(node.arguments[1], 'defaultText')

  if (fullKey) {
    const { key, context } = parseKey(fullKey)
    return { fullKey, key, context, defaultText, type: 'text', filePath }
  }
}

export class CollectedFile {
  filePath: string
  fileContents: string
  extractions: Extraction[] = []

  constructor(
    private cache: Cache,
    filePath: string,
    fileContents: string,
  ) {
    this.filePath = filePath
    this.fileContents = fileContents
    this.extractions = this.getExtractions()
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
    this.extractions = this.getExtractions()
    return true
  }

  handleError(filePath: string, code: string, e: any) {
    const message =
      typeof e === 'object' && e !== null
        ? e.message
        : 'Failed to parse text arguments.'

    logger.error(`${message + filePath}\n`, code)

    throw new Error('Failed to extract texts.')
  }

  /**
   * Find all possible extractions from the given source.
   */
  private getExtractions(): Extraction[] {
    const extractions: Extraction[] = []
    if (this.fileContents.includes('$texts(')) {
      extractions.push(...this.extractSingle())
    }
    if (this.fileContents.includes('$textsPlural(')) {
      extractions.push(...this.extractPlural())
    }
    return extractions
  }

  /**
   * Extract the single text method calls.
   */
  extractSingle(): ExtractionText[] {
    return extractMethodCalls(this.fileContents, '$texts(')
      .map((match) => {
        const cached = this.cache.singleCache.get(match)
        if (cached) {
          return cached
        }

        try {
          const tree = parse(match, {
            ecmaVersion: 'latest',
          })

          const result = extract(tree, this.filePath)
          if (result) {
            this.cache.singleCache.set(match, result)
          }
          return result
        } catch (e) {
          this.handleError(this.filePath, match, e)
        }

        return null
      })
      .filter(falsy)
  }

  /**
   * Extract the text plural method calls.
   */
  extractPlural(): ExtractionPlural[] {
    return extractMethodCalls(this.fileContents, '$textsPlural(')
      .map((match) => {
        const cached = this.cache.pluralCache.get(match)
        if (cached) {
          return cached
        }
        try {
          const tree = parse(match, {
            ecmaVersion: 'latest',
          })
          const result = extractPlural(tree, this.filePath)
          if (result) {
            this.cache.pluralCache.set(match, result)
          }
          return result
        } catch (e) {
          this.handleError(this.filePath, match, e)
        }

        return null
      })
      .filter(falsy)
  }
}

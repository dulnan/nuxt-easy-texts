/* eslint no-console: 0 */
import { promises as fs } from 'node:fs'
import type { BaseCallExpression, Expression, SpreadElement } from 'estree'
import { parse } from 'acorn'
import { falsy } from '../helpers'
import type { Extraction, ExtractionPlural, ExtractionText } from '../types'
import { RGX_TEXTS, RGX_TEXTS_PLURAL } from './../vitePlugin'

export function getExpression(program: any): BaseCallExpression {
  return program.body[0]?.expression
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

export function parseKey(v: string) {
  // e.g. 'global.homepage'
  // ['global', 'homepage']
  const [a, b] = v.split('.', 2)

  // e.g. 'search'
  // ['search', undefined]
  if (!b) {
    return {
      key: a,
    }
  }
  return {
    key: b,
    context: a,
  }
}

export function extract(
  program: any,
  filePath: string,
): ExtractionText | undefined {
  const node = getExpression(program)

  const fullKey = extractLiteral(node.arguments[0], 'key', true)
  const defaultText = extractLiteral(node.arguments[1], 'defaultText')

  if (fullKey) {
    const { key, context } = parseKey(fullKey)
    return { fullKey, key, context, defaultText, type: 'text', filePath }
  }
}

export function extractPlural(
  program: any,
  filePath: string,
): ExtractionPlural | undefined {
  const node = getExpression(program)

  const fullKey = extractLiteral(node.arguments[0], 'key', true)
  const singular = extractLiteral(node.arguments[2], 'singular', true)
  const plural = extractLiteral(node.arguments[3], 'plural', true)

  if (fullKey && singular && plural) {
    const { key, context } = parseKey(fullKey)
    return { fullKey, key, context, singular, plural, type: 'plural', filePath }
  }
}

/**
 * Service to handle text extractions across multiple files.
 */
export default class Extractor {
  files: Record<string, Record<string, Extraction>> = {}
  isBuild = false

  constructor(isBuild = false, globalTexts?: Record<string, string>) {
    this.isBuild = isBuild
    this.files['nuxt.config.ts'] = {}

    if (globalTexts) {
      Object.entries(globalTexts).forEach(([fullKey, defaultText]) => {
        const { key, context } = parseKey(fullKey)
        this.files['nuxt.config.ts'][fullKey] = {
          type: 'text',
          fullKey,
          key,
          context,
          defaultText,
          filePath: 'nuxt.config.ts',
        }
      })
    }
  }

  /**
   * Add files by path.
   */
  addFiles(files: string[]): Promise<boolean[]> {
    return Promise.all(files.map((v) => this.handleFile(v)))
  }

  /**
   * Read the file and extract the texts.
   *
   * Returns a promise containing a boolean that indicated if the given file
   * should trigger a rebuild of the query.
   */
  async handleFile(filePath: string): Promise<boolean> {
    const source = await this.readFile(filePath)
    const extractions = this.getExtractions(source, filePath)

    // New file that didn't previously contain text extractions.
    if (!this.files[filePath]) {
      this.files[filePath] = {}
      extractions.forEach((v) => {
        this.files[filePath][v.key] = v
      })
      return true
    }

    const differentLength =
      Object.keys(this.files[filePath]).length !== extractions.length

    // File previously contained extractions. Compare the two arrays to
    // determine if something changed.
    const hasChange =
      differentLength ||
      extractions.some((extraction) => {
        const existing = this.files[filePath][extraction.key]
        // New extraction key.
        if (!existing) {
          return true
        }
        if (existing.type !== extraction.type) {
          return true
        }

        if (existing.type === 'text' && extraction.type === 'text') {
          if (existing.defaultText !== extraction.defaultText) {
            return true
          }
        }

        if (existing.type === 'plural' && extraction.type === 'plural') {
          if (existing.singular !== extraction.singular) {
            return true
          }
          if (existing.plural !== extraction.plural) {
            return true
          }
        }

        return false
      })

    if (hasChange) {
      this.files[filePath] = {}
      extractions.forEach((v) => {
        this.files[filePath][v.key] = v
      })
    }

    return hasChange
  }

  /**
   * Find all possible extractions from the given source.
   */
  getExtractions(source: string, filePath: string) {
    const extractions: Extraction[] = []
    if (source.includes('$texts(')) {
      extractions.push(...this.extractSingle(source, filePath))
    }
    if (source.includes('$textsPlural(')) {
      extractions.push(...this.extractPlural(source, filePath))
    }
    return extractions
  }

  handleError(filePath: string, _code: string, e: any) {
    const message =
      typeof e === 'object' && e !== null
        ? e.message
        : 'Failed to parse text arguments.'

    console.error(`${message + filePath}\n`)

    if (this.isBuild) {
      throw new Error('Failed to extract texts.')
    }
  }

  /**
   * Extract the single text method calls.
   */
  extractSingle(source: string, filePath: string): Extraction[] {
    return [...source.matchAll(RGX_TEXTS)]
      .map((match) => {
        const code = match[0]
        const tree = parse(code, {
          ecmaVersion: 'latest',
        })

        let extractedTree = null
        try {
          extractedTree = extract(tree, filePath)
        } catch (e) {
          this.handleError(filePath, code, e)
        }

        return extractedTree
      })
      .filter(falsy)
  }

  /**
   * Extract the text plural method calls.
   */
  extractPlural(source: string, filePath: string): ExtractionPlural[] {
    return [...source.matchAll(RGX_TEXTS_PLURAL)]
      .map((match) => {
        const code = match[0]
        const tree = parse(code, {
          ecmaVersion: 'latest',
        })

        let extractedTree = null
        try {
          extractedTree = extractPlural(tree, filePath)
        } catch (e) {
          this.handleError(filePath, code, e)
        }

        return extractedTree
      })
      .filter(falsy)
  }

  /**
   * Read the given file and return its contents.
   */
  readFile(filePath: string) {
    return fs.readFile(filePath).then((v) => {
      return v.toString()
    })
  }

  /**
   * Generate the query.
   */
  getUniqueExtractions(): Extraction[] {
    const allExtractions: Extraction[] = Object.keys(this.files)
      .map((file) => {
        const extractionMap = this.files[file]
        return Object.keys(extractionMap).map((v) => extractionMap[v])
      })
      .flat()

    // Create map for the unique text keys.
    const texts: Record<string, Extraction> = allExtractions.reduce<
      Record<string, Extraction>
    >((acc, v) => {
      const existing = acc[v.fullKey]
      if (existing) {
        if (
          'defaultText' in existing &&
          'defaultText' in v &&
          existing.defaultText !== v.defaultText &&
          existing.defaultText &&
          v.defaultText
        ) {
          console.info(
            `The text key "${v.fullKey}" has multiple different default texts:"`,
          )
          console.info(v.filePath)
          console.info(v.defaultText)
          console.info(existing.filePath)
          console.info(existing.defaultText)
        } else if (existing.type !== v.type) {
          console.info(
            `The text key "${v.fullKey}" is used for two different text types:"`,
          )
          console.info(v.filePath)
          console.info(existing.filePath)
        }
      }

      // Only set it once.
      if (!existing) {
        acc[v.fullKey] = v
      }

      return acc
    }, {})

    return Object.values(texts).sort((a, b) =>
      a.fullKey.localeCompare(b.fullKey),
    )
  }
}

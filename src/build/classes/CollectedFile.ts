import { promises as fs } from 'node:fs'
import { parse, type Program } from 'acorn'
import type {
  Extraction,
  ExtractionError,
  MethodCall,
} from '../types/extraction'
import type { Cache } from './Cache'
import { extractMethodCalls } from '../helpers/code'
import { extractPlural, extractSingle } from '../helpers/ast'

export class CollectedFile {
  filePath: string
  fileContents: string
  extractions: Extraction[] = []
  errors: ExtractionError[] = []
  private key: string = ''

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
    const keyBefore = this.key
    this.buildExtractions()

    // If the key is the same, no change.
    if (keyBefore === this.key) {
      return false
    }
    return true
  }

  handleError(e: unknown, call: MethodCall) {
    const message =
      e instanceof Error ? e.message : 'Failed to parse text arguments.'

    this.errors.push({
      message,
      call,
      filePath: this.filePath,
    })
  }

  /**
   * Find all possible extractions from the given source.
   */
  private buildExtractions() {
    this.extractions = []
    this.errors = []
    this.key = ''

    if (this.fileContents.includes('$texts(')) {
      this.extract('$texts(', this.cache.singleCache, extractSingle)
    }
    if (this.fileContents.includes('$textsPlural(')) {
      this.extract('$textsPlural(', this.cache.pluralCache, extractPlural)
    }
  }

  private addExtraction(v: Extraction) {
    this.extractions.push(v)
    if (v.call) {
      this.key += v.call.code
    } else {
      this.key += v.fullKey
    }
  }

  /**
   * Extract the single text method calls.
   */
  extract<T extends Extraction>(
    name: string,
    cache: Map<string, T>,
    method: (
      program: Program,
      filePath: string,
      call: MethodCall,
    ) => T | undefined,
  ) {
    const calls = extractMethodCalls(this.fileContents, name)
    for (const call of calls) {
      const cached = cache.get(call.code)
      if (cached) {
        this.addExtraction({ ...cached, call })
        continue
      }

      try {
        const tree = parse(call.code, {
          ecmaVersion: 'latest',
        })

        const result = method(tree, this.filePath, call)
        if (result) {
          cache.set(call.code, result)
          this.addExtraction(result)
        }
      } catch (e) {
        this.handleError(e, call)
      }
    }
  }
}

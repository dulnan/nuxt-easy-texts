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

    this.addError(message, call)
  }

  /**
   * Errors are part of the key, so that update() reports a change when only
   * the errors differ and the dev server logs them.
   */
  private addError(message: string, call: MethodCall) {
    this.errors.push({
      message,
      call,
      filePath: this.filePath,
    })
    this.key += `\0${call.code}\0${message}`
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
    const calls = extractMethodCalls(this.fileContents, name, (start) => {
      this.addError(
        `Found "${name}" without a closing parenthesis. A mention in a comment or string is also read as a call.`,
        { code: name, start, end: start + name.length },
      )
    })
    for (const call of calls) {
      const cached = cache.get(call.code)
      if (cached) {
        // The cached extraction may come from another file with the same call.
        this.addExtraction({ ...cached, call, filePath: this.filePath })
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

import { basename } from 'pathe'
import type { WatchEvent } from 'nuxt/schema'
import { addServerTemplate, addTemplate, addTypeTemplate } from '@nuxt/kit'
import { isSingleText, logger } from '../helpers'
import type { CollectorTemplate } from '../templates/defineTemplate'
import type { Extraction, ExtractionError } from '../types/extraction'
import { CollectedFile } from './CollectedFile'
import type { ModuleHelper } from './ModuleHelper'
import { Cache } from './Cache'
import colors from 'picocolors'
import { parseKey } from '../helpers/ast'

export type CollectorWatchEventResult = {
  hasChanged: boolean
  errors?: ExtractionError[]
}

export class Collector {
  /**
   * All collected files.
   */
  private files = new Map<string, CollectedFile>()

  /**
   * The extractions provided by nuxt.config.ts
   */
  private globalExtractions: Extraction[] = []

  /**
   * All file paths provided by hooks.
   */
  private hookFiles = new Set<string>()

  /**
   * The registered templates.
   */
  private templates: CollectorTemplate[] = []

  /**
   * The generated template contents.
   */
  private templateResult: Map<string, string> = new Map()

  /**
   * The module helper.
   */
  private helper: ModuleHelper

  /**
   * The cache.
   */
  private cache: Cache

  constructor(helper: ModuleHelper) {
    this.helper = helper
    this.cache = new Cache()

    this.globalExtractions = Object.entries(
      this.helper.options.globalTexts,
    ).map(([fullKey, value]) => {
      const { key, context } = parseKey(fullKey)
      if (typeof value === 'string') {
        return {
          type: 'text',
          fullKey,
          key,
          context,
          defaultText: value,
          filePath: 'nuxt.config.ts',
        }
      }

      return {
        type: 'plural',
        fullKey,
        key,
        context,
        singular: value[0],
        plural: value[1],
        filePath: 'nuxt.config.ts',
        source: '',
      }
    })
  }

  public reset() {
    this.files.clear()
  }

  private getTemplate(template: string): string {
    const content = this.templateResult.get(template)
    if (content === undefined) {
      throw new Error(`Missing template content: ${template}`)
    }

    return content
  }

  /**
   * Executes code gen and performs validation for operations.
   */
  private async buildState(): Promise<{ errors: ExtractionError[] }> {
    this.helper.logDebug('buildState')
    const extractionsMap = new Map<string, Extraction>()
    const errors: ExtractionError[] = []
    const singleDefaults = new Map<string, string>()
    const pluralDefaults = new Map<string, [string, string]>()
    const withoutDefaultTexts: Extraction[] = []

    for (const extraction of this.globalExtractions) {
      extractionsMap.set(extraction.fullKey, extraction)
    }

    for (const file of this.files.values()) {
      for (const extraction of file.extractions) {
        extractionsMap.set(extraction.fullKey, extraction)
        if (extraction.type === 'text') {
          if (extraction.defaultText) {
            const existing = singleDefaults.get(extraction.fullKey)
            if (existing && existing !== extraction.defaultText) {
              errors.push({
                filePath: extraction.filePath,
                call: extraction.call,
                message: `$texts key "${extraction.fullKey}" has different default texts ("${existing}" vs. "${extraction.defaultText}").`,
              })
            } else {
              singleDefaults.set(extraction.fullKey, extraction.defaultText)
            }
          } else {
            withoutDefaultTexts.push(extraction)
          }
        } else {
          if (extraction.singular && extraction.plural) {
            const existing = pluralDefaults.get(extraction.fullKey)
            if (
              existing &&
              (existing[0] !== extraction.singular ||
                existing[1] !== extraction.plural)
            ) {
              let message = `$textsPlural key "${extraction.fullKey}" has multiple `

              if (existing[0] !== extraction.singular) {
                message += `singular texts ("${existing[0]}" vs. "${extraction.singular}")`
              }
              if (existing[1] !== extraction.plural) {
                message += `and plural texts ("${existing[0]}" vs. ${extraction.plural})`
              }

              message += '.'
              errors.push({
                filePath: extraction.filePath,
                call: extraction.call,
                message,
              })
            } else {
              pluralDefaults.set(extraction.fullKey, [
                extraction.singular,
                extraction.plural,
              ])
            }
          } else {
            withoutDefaultTexts.push(extraction)
          }
        }
      }
      if (file.errors.length) {
        errors.push(...file.errors)
      }
    }

    const extractions = [...extractionsMap.values()]
      .sort((a, b) => b.fullKey.localeCompare(a.fullKey))
      .map((extraction) => {
        if (extraction.type === 'text') {
          return {
            ...extraction,
            defaultText:
              extraction.defaultText || singleDefaults.get(extraction.fullKey),
          }
        }
        const defaults = pluralDefaults.get(extraction.fullKey)
        return {
          ...extraction,
          singular: extraction.singular || defaults?.[0] || '',
          plural: extraction.plural || defaults?.[1] || '',
        }
      })

    for (const extraction of withoutDefaultTexts) {
      if (isSingleText(extraction)) {
        const hasDefaultText = singleDefaults.has(extraction.fullKey)
        if (!hasDefaultText) {
          errors.push({
            message: `No default text exists for $texts key "${extraction.fullKey}".`,
            call: extraction.call,
            filePath: extraction.filePath,
          })
        }
      } else {
        const hasDefaultText = pluralDefaults.has(extraction.fullKey)
        if (!hasDefaultText) {
          errors.push({
            message: `No default texts exists for $textsPlural key "${extraction.fullKey}".`,
            call: extraction.call,
            filePath: extraction.filePath,
          })
        }
      }
    }

    for (const template of this.templates) {
      if (template.build) {
        const content = await template.build(extractions, this.helper)
        this.templateResult.set(template.options.path + 'build', content)
      }

      if (template.buildTypes) {
        const content = await template.buildTypes(extractions, this.helper)
        this.templateResult.set(template.options.path + 'buildTypes', content)
      }
    }

    if (errors.length) {
      this.logErrors(errors)
    }

    return { errors }
  }

  private logErrors(errors: ExtractionError[]) {
    logger.error('nuxt-easy-texts validation failed.')
    const separator = '\n' + colors.gray('─'.repeat(80))
    errors.forEach((error) => {
      let boxMessage =
        error.message +
        separator +
        '\n' +
        colors.bold(
          'file://./' + this.helper.toSourceRelative(error.filePath),
        ) +
        separator

      if (error.call) {
        const fileContents = this.files.get(error.filePath)?.fileContents

        if (fileContents) {
          // Find the line numbers.
          const lines = fileContents.split('\n')
          let lineNumber = 1
          let currentPos = 0
          let startLine = 0

          // Find which line contains the start position.
          for (const line of lines) {
            currentPos += line.length + 1 // +1 for the newline character
            if (currentPos >= error.call.start) {
              startLine = lineNumber
              break
            }
            lineNumber++
          }

          // Get context: 3 lines before and 3 lines after
          const contextStart = Math.max(startLine - 3, 1)
          const contextEnd = Math.min(startLine + 3, lines.length)

          // Add context lines to the message
          boxMessage += '\n\n'

          for (let i = contextStart - 1; i < contextEnd; i++) {
            const lineNum = i + 1
            const lineContent = lines[i] || ''

            // Check if this line contains part of the method call
            const lineStartPos =
              i === 0
                ? 0
                : lines
                    .slice(0, i)
                    .reduce((sum, line) => sum + line.length + 1, 0)
            const lineEndPos = lineStartPos + lineContent.length

            const containsCallStart =
              lineStartPos <= error.call.start && error.call.start < lineEndPos
            const containsCallEnd =
              lineStartPos < error.call.end && error.call.end <= lineEndPos
            const containedInCall =
              error.call.start <= lineStartPos && lineEndPos <= error.call.end

            const isPartOfCall =
              containsCallStart || containsCallEnd || containedInCall

            // Format line number
            const lineNumStr = `${lineNum}`.padStart(4)

            if (isPartOfCall) {
              // This line contains part of the method call - show in red
              boxMessage += `${lineNumStr} | ${colors.bold(colors.red(lineContent))}\n`
            } else {
              // Regular context line
              boxMessage += `${lineNumStr} | ${lineContent}\n`
            }
          }
        }
      }

      logger.box(boxMessage)
    })
  }

  /**
   * Initialise the collector.
   *
   * In dev mode, the method will call itself recursively until all documents
   * are valid.
   *
   * If not in dev mode the method will throw an error when documents are not
   * valid.
   */
  public async init(): Promise<void> {
    try {
      await this.initDocuments()
      const { errors } = await this.buildState()
      if (errors.length) {
        throw new Error('nuxt-easy-texts initialisation failed.')
      }
    } catch {
      // During dev mode, don't rethrow the error.
      if (this.helper.isDev) {
        return
      }
      throw new Error('nuxt-easy-texts initialisation failed.')
    }
  }

  public addHookFile(filePath: string) {
    this.hookFiles.add(filePath)
  }

  /**
   * Initialise the collector.
   */
  private async initDocuments() {
    // Get all files that match the import patterns.
    const files = await this.helper.getImportPatternFiles()

    for (const filePath of files) {
      await this.addFile(filePath)
    }
  }

  /**
   * Add a file.
   */
  private async addFile(filePath: string): Promise<CollectedFile | null> {
    const file = await CollectedFile.fromFilePath(this.cache, filePath)

    // Skip empty files.
    if (!file?.fileContents) {
      return null
    }

    this.files.set(filePath, file)
    return file
  }

  private matchesPatternOrExists(filePath: string): boolean {
    return (
      this.files.has(filePath) ||
      this.hookFiles.has(filePath) ||
      this.helper.matchesImportPattern(filePath)
    )
  }

  private async handleAdd(filePath: string): Promise<boolean> {
    if (!this.matchesPatternOrExists(filePath)) {
      return false
    }
    const result = await this.addFile(filePath)
    return !!result
  }

  private async handleChange(filePath: string): Promise<boolean> {
    if (!this.matchesPatternOrExists(filePath)) {
      return false
    }
    const file = this.files.get(filePath)

    // If the file does not yet exist, it might have been skipped when it was
    // added (e.g. because it's empty).
    if (!file) {
      return this.handleAdd(filePath)
    }

    try {
      return await file.update()
    } catch {
      // Error: File is invalid (e.g. empty), so let's remove it.
      return this.handleUnlink(filePath)
    }
  }

  private handleUnlink(filePath: string): boolean {
    const file = this.files.get(filePath)
    if (!file) {
      return false
    }
    this.files.delete(filePath)
    return true
  }

  private handleUnlinkDir(folderPath: string): boolean {
    let anyHasChanged = false
    for (const filePath of [...this.files.keys()]) {
      if (filePath.startsWith(folderPath)) {
        const hasChanged = this.handleUnlink(filePath)
        if (hasChanged) {
          anyHasChanged = true
        }
      }
    }

    return anyHasChanged
  }

  /**
   * Handle the watcher event for the given file path.
   */
  public async handleWatchEvent(
    event: WatchEvent,
    filePath: string,
  ): Promise<CollectorWatchEventResult> {
    let hasChanged = false
    this.helper.logDebug(`handleWatchEvent: ${event}` + filePath)
    try {
      if (event === 'add') {
        hasChanged = await this.handleAdd(filePath)
      } else if (event === 'change') {
        hasChanged = await this.handleChange(filePath)
      } else if (event === 'unlink') {
        hasChanged = this.handleUnlink(filePath)
      } else if (event === 'unlinkDir') {
        hasChanged = this.handleUnlinkDir(filePath)
      }

      if (hasChanged) {
        const { errors } = await this.buildState()
        this.helper.logDebug('hasChanged: ' + hasChanged)
        return { hasChanged, errors }
      }
    } catch (e) {
      logger.error('Failed to extract texts.')
      if (e instanceof Error) {
        logger.error(e)
      }
    }

    return { hasChanged }
  }

  /**
   * Adds a virtual template (not written to disk) for both Nuxt and Nitro.
   *
   * For some reason a template written to disk works for both Nuxt and Nitro,
   * but a virtual template requires adding two templates.
   */
  private addVirtualTemplate(template: CollectorTemplate) {
    const filename = template.options.path + '.js'
    const getContents = () => this.getTemplate(template.options.path + 'build')

    addTemplate({
      filename,
      getContents,
    })

    addServerTemplate({
      // Since this is a virtual template, the name must match the final
      // alias, example:
      // - nuxt-easy-texts/foobar.mjs => #nuxt-easy-texts/foobar
      //
      // That way we can reference the same template using the alias in both
      // Nuxt and Nitro environments.
      filename: '#' + template.options.path,
      getContents,
    })
  }

  /**
   * Adds a template that dependes on Collector state.
   */
  public addTemplate(template: CollectorTemplate) {
    this.templates.push(template)

    if (template.build) {
      if (template.options.virtual) {
        this.addVirtualTemplate(template)
      } else {
        const templateFileName = basename(template.options.path)
        const filename = templateFileName.includes('.')
          ? template.options.path
          : template.options.path + '.js'

        addTemplate({
          filename,
          write: true,
          getContents: () => this.getTemplate(template.options.path + 'build'),
        })
      }
    }

    if (template.buildTypes) {
      const filename = (template.options.path + '.d.ts') as `${string}.d.ts`
      addTypeTemplate(
        {
          filename,
          write: true,
          getContents: () =>
            this.getTemplate(template.options.path + 'buildTypes'),
        },
        {
          nuxt: true,
          nitro: true,
        },
      )
    }
  }
}

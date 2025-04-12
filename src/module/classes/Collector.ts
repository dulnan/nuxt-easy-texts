import { basename } from 'pathe'
import type { WatchEvent } from 'nuxt/schema'
import { addServerTemplate, addTemplate, addTypeTemplate } from '@nuxt/kit'
import { logger } from '../helpers'
import type { CollectorTemplate } from '../templates/defineTemplate'
import type { Extraction } from '../types/extraction'
import { CollectedFile, parseKey, type ExtractionError } from './CollectedFile'
import type { ModuleHelper } from './ModuleHelper'
import { Cache } from './Cache'
import colors from 'picocolors'

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
    ).map<Extraction>(([fullKey, value]) => {
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
    const extractionsMap = new Map<string, Extraction>()
    const errors: ExtractionError[] = []
    for (const file of this.files.values()) {
      for (const extraction of file.extractions) {
        extractionsMap.set(extraction.fullKey, extraction)
      }
      if (file.errors.length) {
        errors.push(...file.errors)
      }
    }

    for (const extraction of this.globalExtractions) {
      extractionsMap.set(extraction.fullKey, extraction)
    }

    const extractions = [...extractionsMap.values()].sort((a, b) =>
      b.fullKey.localeCompare(a.fullKey),
    )

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
      logger.error('Invalid texts detected.')
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
        const lines = error.source.split('\n').filter(Boolean)
        lines.forEach((line) => {
          boxMessage += '\n' + colors.bold(colors.red(line))
        })
        logger.box(boxMessage)
      })
    }

    return { errors }
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
    } catch (e) {
      logger.error(e)
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
      const needsUpdate = await file.update()
      if (!needsUpdate) {
        return false
      }
    } catch {
      // Error: File is invalid (e.g. empty), so let's remove it.
      return this.handleUnlink(filePath)
    }

    return true
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
      // - nuxt-graphql-middleware/foobar.mjs => #nuxt-graphql-middleware/foobar
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
      const filename = (template.options.path + '.d.ts') as any
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

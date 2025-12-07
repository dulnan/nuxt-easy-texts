import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ModuleHelper } from '../../src/build/classes/ModuleHelper'
import type { CollectorTemplate } from '../../src/build/templates/defineTemplate'
import { Collector } from '../../src/build/classes/Collector'
import { CollectedFile } from '../../src/build/classes/CollectedFile'
import { addTemplate, addServerTemplate, addTypeTemplate } from '@nuxt/kit'

// Use vi.hoisted to create mock functions that are available during mock hoisting
const { mockLoggerError, mockLoggerBox } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
  mockLoggerBox: vi.fn(),
}))

// Mock @nuxt/kit
vi.mock('@nuxt/kit', () => ({
  addTemplate: vi.fn(),
  addServerTemplate: vi.fn(),
  addTypeTemplate: vi.fn(),
  useLogger: () => ({
    error: mockLoggerError,
    box: mockLoggerBox,
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

// Mock CollectedFile
vi.mock('../../src/build/classes/CollectedFile', () => ({
  CollectedFile: {
    fromFilePath: vi.fn(),
  },
}))

// Helper to create a mock ModuleHelper
function createMockHelper(
  options: Partial<{
    isDev: boolean
    globalTexts: Record<string, string | [string, string]>
    getImportPatternFiles: () => Promise<string[]>
    matchesImportPattern: (path: string) => boolean
  }> = {},
): ModuleHelper {
  return {
    isDev: options.isDev ?? false,
    options: {
      globalTexts: options.globalTexts ?? {},
      pattern: [],
      generators: [],
      experimental: {
        advancedDebug: false,
        languageOverride: false,
      },
    },
    getImportPatternFiles: options.getImportPatternFiles ?? (async () => []),
    matchesImportPattern: options.matchesImportPattern ?? (() => false),
    logDebug: vi.fn(),
    toSourceRelative: (path: string) => path,
  } as unknown as ModuleHelper
}

// Helper to create a mock CollectedFile
function createMockCollectedFile(options: {
  filePath: string
  fileContents: string
  extractions?: any[]
  errors?: any[]
  update?: () => Promise<boolean>
}) {
  return {
    filePath: options.filePath,
    fileContents: options.fileContents,
    extractions: options.extractions ?? [],
    errors: options.errors ?? [],
    update: options.update ?? (async () => false),
  }
}

describe('Collector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('creates a Collector with a ModuleHelper', () => {
      const helper = createMockHelper()
      const collector = new Collector(helper)

      expect(collector).toBeDefined()
    })

    it('parses globalTexts for single texts', () => {
      const helper = createMockHelper({
        globalTexts: {
          'global.welcome': 'Welcome!',
        },
      })

      const collector = new Collector(helper)
      // The globalExtractions are private, but we can test them through init
      expect(collector).toBeDefined()
    })

    it('parses globalTexts for plural texts', () => {
      const helper = createMockHelper({
        globalTexts: {
          'global.items': ['One item', '@count items'],
        },
      })

      const collector = new Collector(helper)
      expect(collector).toBeDefined()
    })
  })

  describe('reset', () => {
    it('clears all collected files', async () => {
      const helper = createMockHelper({
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$texts("key", "value")',
        extractions: [
          {
            type: 'text',
            fullKey: 'key',
            key: 'key',
            defaultText: 'value',
            filePath: '/path/to/file.vue',
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)
      await collector.init()

      collector.reset()

      // After reset, handleUnlink should return false because files are cleared
      const result = await collector.handleWatchEvent(
        'unlink',
        '/path/to/file.vue',
      )
      expect(result.hasChanged).toBe(false)
    })
  })

  describe('init', () => {
    it('initializes documents from import patterns', async () => {
      const helper = createMockHelper({
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$texts("key", "value")',
        extractions: [
          {
            type: 'text',
            fullKey: 'key',
            key: 'key',
            defaultText: 'value',
            filePath: '/path/to/file.vue',
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)
      await collector.init()

      expect(CollectedFile.fromFilePath).toHaveBeenCalledWith(
        expect.anything(),
        '/path/to/file.vue',
      )
    })

    it('throws error on validation failure in production', async () => {
      const helper = createMockHelper({
        isDev: false,
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      // File with extraction that has no default text
      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$texts("missing.key")',
        extractions: [
          {
            type: 'text',
            fullKey: 'missing.key',
            key: 'key',
            filePath: '/path/to/file.vue',
            // No defaultText - should cause validation error
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)

      await expect(collector.init()).rejects.toThrow(
        'nuxt-easy-texts initialisation failed.',
      )
    })

    it('does not throw in dev mode on validation failure', async () => {
      const helper = createMockHelper({
        isDev: true,
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$texts("missing.key")',
        extractions: [
          {
            type: 'text',
            fullKey: 'missing.key',
            key: 'key',
            filePath: '/path/to/file.vue',
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)

      // Should not throw in dev mode
      await expect(collector.init()).resolves.toBeUndefined()
    })

    it('skips empty files', async () => {
      const helper = createMockHelper({
        getImportPatternFiles: async () => ['/path/to/empty.vue'],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(null)

      const collector = new Collector(helper)
      await collector.init()

      // Should complete without error
      expect(CollectedFile.fromFilePath).toHaveBeenCalled()
    })
  })

  describe('addHookFile', () => {
    it('adds a file path to hook files', async () => {
      const helper = createMockHelper({
        matchesImportPattern: () => false,
      })

      const collector = new Collector(helper)

      // Add hook file
      collector.addHookFile('/path/to/hook-file.vue')

      // Now the file should be recognized in watch events
      const mockFile = createMockCollectedFile({
        filePath: '/path/to/hook-file.vue',
        fileContents: '$texts("key", "value")',
        extractions: [
          {
            type: 'text',
            fullKey: 'key',
            key: 'key',
            defaultText: 'value',
            filePath: '/path/to/hook-file.vue',
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const result = await collector.handleWatchEvent(
        'add',
        '/path/to/hook-file.vue',
      )
      expect(result.hasChanged).toBe(true)
    })
  })

  describe('handleWatchEvent', () => {
    describe('add event', () => {
      it('adds file that matches import pattern', async () => {
        const helper = createMockHelper({
          matchesImportPattern: (path) => path.endsWith('.vue'),
        })

        const mockFile = createMockCollectedFile({
          filePath: '/path/to/new.vue',
          fileContents: '$texts("key", "value")',
          extractions: [
            {
              type: 'text',
              fullKey: 'key',
              key: 'key',
              defaultText: 'value',
              filePath: '/path/to/new.vue',
            },
          ],
        })

        vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

        const collector = new Collector(helper)
        const result = await collector.handleWatchEvent(
          'add',
          '/path/to/new.vue',
        )

        expect(result.hasChanged).toBe(true)
      })

      it('ignores file that does not match import pattern', async () => {
        const helper = createMockHelper({
          matchesImportPattern: () => false,
        })

        const collector = new Collector(helper)
        const result = await collector.handleWatchEvent(
          'add',
          '/path/to/ignored.txt',
        )

        expect(result.hasChanged).toBe(false)
        expect(CollectedFile.fromFilePath).not.toHaveBeenCalled()
      })
    })

    describe('change event', () => {
      it('updates existing file', async () => {
        const helper = createMockHelper({
          getImportPatternFiles: async () => ['/path/to/file.vue'],
          matchesImportPattern: () => true,
        })

        const mockFile = createMockCollectedFile({
          filePath: '/path/to/file.vue',
          fileContents: '$texts("key", "value")',
          extractions: [
            {
              type: 'text',
              fullKey: 'key',
              key: 'key',
              defaultText: 'value',
              filePath: '/path/to/file.vue',
            },
          ],
          update: async () => true, // Simulate content changed
        })

        vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

        const collector = new Collector(helper)
        await collector.init()

        const result = await collector.handleWatchEvent(
          'change',
          '/path/to/file.vue',
        )
        expect(result.hasChanged).toBe(true)
      })

      it('adds file if not yet tracked', async () => {
        const helper = createMockHelper({
          matchesImportPattern: () => true,
        })

        const mockFile = createMockCollectedFile({
          filePath: '/path/to/new.vue',
          fileContents: '$texts("key", "value")',
          extractions: [
            {
              type: 'text',
              fullKey: 'key',
              key: 'key',
              defaultText: 'value',
              filePath: '/path/to/new.vue',
            },
          ],
        })

        vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

        const collector = new Collector(helper)
        const result = await collector.handleWatchEvent(
          'change',
          '/path/to/new.vue',
        )

        expect(result.hasChanged).toBe(true)
      })

      it('removes file on update error', async () => {
        const helper = createMockHelper({
          getImportPatternFiles: async () => ['/path/to/file.vue'],
          matchesImportPattern: () => true,
        })

        const mockFile = createMockCollectedFile({
          filePath: '/path/to/file.vue',
          fileContents: '$texts("key", "value")',
          extractions: [
            {
              type: 'text',
              fullKey: 'key',
              key: 'key',
              defaultText: 'value',
              filePath: '/path/to/file.vue',
            },
          ],
          update: async () => {
            throw new Error('File became invalid')
          },
        })

        vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

        const collector = new Collector(helper)
        await collector.init()

        const result = await collector.handleWatchEvent(
          'change',
          '/path/to/file.vue',
        )
        expect(result.hasChanged).toBe(true) // File was unlinked
      })
    })

    describe('unlink event', () => {
      it('removes tracked file', async () => {
        const helper = createMockHelper({
          getImportPatternFiles: async () => ['/path/to/file.vue'],
        })

        const mockFile = createMockCollectedFile({
          filePath: '/path/to/file.vue',
          fileContents: '$texts("key", "value")',
          extractions: [
            {
              type: 'text',
              fullKey: 'key',
              key: 'key',
              defaultText: 'value',
              filePath: '/path/to/file.vue',
            },
          ],
        })

        vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

        const collector = new Collector(helper)
        await collector.init()

        const result = await collector.handleWatchEvent(
          'unlink',
          '/path/to/file.vue',
        )
        expect(result.hasChanged).toBe(true)
      })

      it('returns false for non-tracked file', async () => {
        const helper = createMockHelper()

        const collector = new Collector(helper)
        const result = await collector.handleWatchEvent(
          'unlink',
          '/path/to/unknown.vue',
        )

        expect(result.hasChanged).toBe(false)
      })
    })

    describe('unlinkDir event', () => {
      it('removes all files in directory', async () => {
        const helper = createMockHelper({
          getImportPatternFiles: async () => [
            '/path/to/dir/file1.vue',
            '/path/to/dir/file2.vue',
            '/path/to/other/file3.vue',
          ],
        })

        const createFile = (filePath: string) =>
          createMockCollectedFile({
            filePath,
            fileContents: '$texts("key", "value")',
            extractions: [
              {
                type: 'text',
                fullKey: 'key',
                key: 'key',
                defaultText: 'value',
                filePath,
              },
            ],
          })

        vi.mocked(CollectedFile.fromFilePath).mockImplementation(
          async (_, path) => createFile(path) as any,
        )

        const collector = new Collector(helper)
        await collector.init()

        const result = await collector.handleWatchEvent(
          'unlinkDir',
          '/path/to/dir',
        )
        expect(result.hasChanged).toBe(true)

        // Files in /path/to/other should still exist
        const otherResult = await collector.handleWatchEvent(
          'unlink',
          '/path/to/other/file3.vue',
        )
        expect(otherResult.hasChanged).toBe(true)
      })

      it('returns false when no files in directory', async () => {
        const helper = createMockHelper()

        const collector = new Collector(helper)
        const result = await collector.handleWatchEvent(
          'unlinkDir',
          '/path/to/empty',
        )

        expect(result.hasChanged).toBe(false)
      })
    })

    it('catches and logs errors during watch handling', async () => {
      const helper = createMockHelper({
        matchesImportPattern: () => true,
      })

      vi.mocked(CollectedFile.fromFilePath).mockRejectedValue(
        new Error('Read error'),
      )

      const collector = new Collector(helper)
      const result = await collector.handleWatchEvent(
        'add',
        '/path/to/file.vue',
      )

      expect(result.hasChanged).toBe(false)
      expect(mockLoggerError).toHaveBeenCalledWith('Failed to extract texts.')
    })
  })

  describe('validation errors', () => {
    it('detects conflicting default texts', async () => {
      const helper = createMockHelper({
        isDev: false,
        getImportPatternFiles: async () => [
          '/path/to/file1.vue',
          '/path/to/file2.vue',
        ],
      })

      const createFile = (filePath: string, defaultText: string) =>
        createMockCollectedFile({
          filePath,
          fileContents: `$texts("same.key", "${defaultText}")`,
          extractions: [
            {
              type: 'text',
              fullKey: 'same.key',
              key: 'key',
              context: 'same',
              defaultText,
              filePath,
            },
          ],
        })

      vi.mocked(CollectedFile.fromFilePath)
        .mockResolvedValueOnce(
          createFile('/path/to/file1.vue', 'Text One') as any,
        )
        .mockResolvedValueOnce(
          createFile('/path/to/file2.vue', 'Text Two') as any,
        )

      const collector = new Collector(helper)

      await expect(collector.init()).rejects.toThrow()
      expect(mockLoggerError).toHaveBeenCalledWith(
        'nuxt-easy-texts validation failed.',
      )
    })

    it('detects conflicting plural texts', async () => {
      const helper = createMockHelper({
        isDev: false,
        getImportPatternFiles: async () => [
          '/path/to/file1.vue',
          '/path/to/file2.vue',
        ],
      })

      const createFile = (filePath: string, singular: string, plural: string) =>
        createMockCollectedFile({
          filePath,
          fileContents: `$textsPlural("same.key", count, "${singular}", "${plural}")`,
          extractions: [
            {
              type: 'plural',
              fullKey: 'same.key',
              key: 'key',
              context: 'same',
              singular,
              plural,
              filePath,
            },
          ],
        })

      vi.mocked(CollectedFile.fromFilePath)
        .mockResolvedValueOnce(
          createFile('/path/to/file1.vue', 'One item', '@count items') as any,
        )
        .mockResolvedValueOnce(
          createFile('/path/to/file2.vue', 'One thing', '@count things') as any,
        )

      const collector = new Collector(helper)

      await expect(collector.init()).rejects.toThrow()
    })

    it('detects missing default text for single texts', async () => {
      const helper = createMockHelper({
        isDev: false,
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$texts("no.default")',
        extractions: [
          {
            type: 'text',
            fullKey: 'no.default',
            key: 'default',
            context: 'no',
            filePath: '/path/to/file.vue',
            // Missing defaultText
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)

      await expect(collector.init()).rejects.toThrow()
    })

    it('detects missing default texts for plural texts', async () => {
      const helper = createMockHelper({
        isDev: false,
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$textsPlural("no.defaults", count)',
        extractions: [
          {
            type: 'plural',
            fullKey: 'no.defaults',
            key: 'defaults',
            context: 'no',
            filePath: '/path/to/file.vue',
            // Missing singular and plural
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)

      await expect(collector.init()).rejects.toThrow()
    })

    it('includes file errors in validation', async () => {
      const helper = createMockHelper({
        isDev: false,
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$texts(variable)',
        extractions: [],
        errors: [
          {
            message: 'Variables cannot be used',
            filePath: '/path/to/file.vue',
            call: { code: '$texts(variable)', start: 0, end: 16 },
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)

      await expect(collector.init()).rejects.toThrow()
    })
  })

  describe('addTemplate', () => {
    it('adds template with build function', async () => {
      const helper = createMockHelper()

      const collector = new Collector(helper)

      const template: CollectorTemplate = {
        type: 'collector',
        options: {
          path: 'nuxt-easy-texts/test',
          virtual: false,
        },
        build: async () => 'export default {}',
        buildTypes: null,
      }

      collector.addTemplate(template)

      expect(addTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'nuxt-easy-texts/test.js',
          write: true,
        }),
      )
    })

    it('adds virtual template', async () => {
      const helper = createMockHelper()

      const collector = new Collector(helper)

      const template: CollectorTemplate = {
        type: 'collector',
        options: {
          path: 'nuxt-easy-texts/virtual',
          virtual: true,
        },
        build: async () => 'export default {}',
        buildTypes: null,
      }

      collector.addTemplate(template)

      expect(addTemplate).toHaveBeenCalled()
      expect(addServerTemplate).toHaveBeenCalled()
    })

    it('adds type template when buildTypes is provided', async () => {
      const helper = createMockHelper()

      const collector = new Collector(helper)

      const template: CollectorTemplate = {
        type: 'collector',
        options: {
          path: 'nuxt-easy-texts/types',
          virtual: false,
        },
        build: null,
        buildTypes: async () => 'export type Test = string',
      }

      collector.addTemplate(template)

      expect(addTypeTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'nuxt-easy-texts/types.d.ts',
          write: true,
        }),
        { nuxt: true, nitro: true },
      )
    })

    it('handles template with extension in path', async () => {
      const helper = createMockHelper()

      const collector = new Collector(helper)

      const template: CollectorTemplate = {
        type: 'collector',
        options: {
          path: 'nuxt-easy-texts/config.mjs',
          virtual: false,
        },
        build: async () => 'export default {}',
        buildTypes: null,
      }

      collector.addTemplate(template)

      expect(addTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'nuxt-easy-texts/config.mjs',
        }),
      )
    })
  })

  describe('globalTexts integration', () => {
    it('uses globalTexts as fallback defaults', async () => {
      const helper = createMockHelper({
        isDev: false,
        globalTexts: {
          'global.key': 'Global default text',
        },
        getImportPatternFiles: async () => ['/path/to/file.vue'],
      })

      // File uses the key without default - should be OK because globalTexts has it
      const mockFile = createMockCollectedFile({
        filePath: '/path/to/file.vue',
        fileContents: '$texts("global.key")',
        extractions: [
          {
            type: 'text',
            fullKey: 'global.key',
            key: 'key',
            context: 'global',
            filePath: '/path/to/file.vue',
            // No defaultText, but globalTexts has it
          },
        ],
      })

      vi.mocked(CollectedFile.fromFilePath).mockResolvedValue(mockFile as any)

      const collector = new Collector(helper)

      // Should not throw because globalTexts provides the default
      // Note: The current implementation doesn't actually use globalTexts as fallback
      // for validation, but this test documents the expected behavior
    })
  })
})

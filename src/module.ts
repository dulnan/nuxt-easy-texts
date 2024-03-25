import { fileURLToPath } from 'url'
import { extname } from 'node:path'
import fs from 'node:fs'
import {
  createResolver,
  defineNuxtModule,
  addPlugin,
  addTemplate,
  addVitePlugin,
  resolveFiles,
  updateTemplates,
  addImports,
} from '@nuxt/kit'
import { fileExists } from './helpers'
import textsVitePlugin from './vitePlugin'
import TextsExtractor from './Extractor'
import type { EasyTextsGenerator } from './types'
import drupalGraphqlTextsGenerator from './generators/drupal-graphql-texts'
import jsonGenerator from './generators/json'

/**
 * Since we have to parse JavaScript in order to figure out the arguments, we
 * can only allow JS-like file extensions.
 */
const POSSIBLE_EXTENSIONS = ['js', 'ts', 'vue', 'mjs']

export type ModuleOptions = {
  /**
   * The pattern of source files to scan for translations.
   */
  pattern?: string[]

  /**
   * Define the generators.
   *
   * A generator is responsible for generating a runtime output file.
   * It could be a compiled GraphQL query, a JSON file or even JavaScript.
   */
  generators: EasyTextsGenerator[]

  /**
   * Define global texts.
   *
   * @example
   * {
   *   learnMore: 'Learn more',
   *   contact: 'Contact',
   *   next: 'Next',
   * }
   */
  globalTexts?: Record<string, string>
}

export type ModuleHooks = {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-easy-texts',
    configKey: 'easyTexts',
    version: '1.0.0',
    compatibility: {
      nuxt: '^3.9.0',
    },
  },
  defaults: {
    generators: [],
  },
  async setup(options, nuxt) {
    // The path to the source directory of this module's consumer.
    const srcDir = nuxt.options.srcDir
    const srcResolver = createResolver(srcDir)

    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    // Transpile all runtime code.
    nuxt.options.build.transpile.push(runtimeDir)
    nuxt.options.alias['#nuxt-easy-texts/types'] = resolve('runtime/types')

    // Setup loader.
    const resolvedPath = '~/app/easyTexts.loader'
      .replace(/^(~~|@@)/, nuxt.options.rootDir)
      .replace(/^(~|@)/, nuxt.options.srcDir)
    const adapterTemplate = (() => {
      const maybeUserFile = fileExists(resolvedPath, ['ts'])

      if (!maybeUserFile) {
        throw new Error(
          'Missing nuxt-easy-texts loader file in ~/app/easyTexts.loader.ts',
        )
      }
      return addTemplate({
        filename: 'nuxt-easy-texts/loader.ts',
        write: true,
        getContents: () => `
import loader from './../../app/easyTexts.loader'
export default loader`,
      })
    })()

    nuxt.options.alias['#nuxt-easy-texts/loader'] = adapterTemplate.dst

    const pattern = options.pattern || [
      './components/**/*.{js,ts,vue}',
      './layouts/**/*.{js,ts,vue}',
      './layers/**/*.{js,ts,vue}',
      './pages/**/*.{js,ts,vue}',
      './composables/**/*.{js,ts,vue}',
    ]

    addPlugin(resolve('runtime/plugins/texts'))

    // Only add the vite plugin when building.
    // if (!nuxt.options.dev) {
    addVitePlugin(textsVitePlugin())
    // }
    addImports({
      from: resolve('./runtime/composables/useEasyTexts'),
      name: 'useEasyTexts',
    })
    // Get all files.
    const files = await resolveFiles(srcDir, pattern, {
      followSymbolicLinks: false,
    })

    // Create extractor instance and add initial set of files.
    const extractor = new TextsExtractor(!nuxt.options.dev, options.globalTexts)
    await extractor.addFiles(files)

    const template = addTemplate({
      filename: 'nuxt-easy-texts/generated-types.ts',
      write: true,
      getContents: () => {
        const allExtractions = extractor.getUniqueExtractions()

        const lines: string[] = []

        Object.values(allExtractions).forEach((extration) => {
          if (extration.type === 'text') {
            lines.push(`  '${extration.fullKey}': "${extration.defaultText}"`)
          }
        })

        lines.push(`  [key: string]: string`)

        return `
export type ExistingTexts = {
${lines.join('\n')}
}
`
      },
      options: {
        texts: true,
      },
    })

    nuxt.options.alias['#nuxt-easy-texts/generated-types'] = template.dst

    const generators = options.generators.map((generator) => {
      const outputPath = srcResolver.resolve(generator.outputPath)
      if (generator.generate === 'drupal-graphql-texts') {
        return {
          outputPath,
          generate: drupalGraphqlTextsGenerator,
        }
      } else if (generator.generate === 'json') {
        return {
          outputPath,
          generate: jsonGenerator,
        }
      }

      return {
        outputPath,
        generate: generator.generate,
      }
    })

    const generateOutputs = () => {
      const extractions = extractor.getUniqueExtractions()
      return Promise.all(
        generators.map((generator) => {
          const generated = generator.generate(extractions)
          const toPromise =
            typeof generated === 'string'
              ? Promise.resolve(generated)
              : generated
          return toPromise.then((result) => {
            return fs.promises.writeFile(generator.outputPath, result)
          })
        }),
      )
    }

    await generateOutputs()

    // Checks if the given file path is handled by this module.
    const applies = (path: string): Promise<string | undefined | void> => {
      const filePath = srcResolver.resolve(path)

      // Check if the file was previously being handled.
      if (extractor.files[filePath]) {
        return Promise.resolve(filePath)
      }

      // Check that only the globally possible file types are used.
      if (!POSSIBLE_EXTENSIONS.includes(extname(filePath))) {
        return Promise.resolve()
      }

      // Get all files based on pattern and check if there is a match.
      return resolveFiles(srcDir, pattern, {
        followSymbolicLinks: false,
      }).then((files) => {
        return files.find((v) => v === filePath)
      })
    }

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
      nuxt.hook('builder:watch', async (_event, path) => {
        const filePath = await applies(path)
        if (!filePath) {
          return
        }
        // Determine if the extractable texts in the file have changed.
        const hasChanged = await extractor.handleFile(filePath)

        // Nothing to do.
        if (!hasChanged) {
          return
        }

        await updateTemplates({
          filter: (template) => {
            return template.options && template.options.texts
          },
        })

        // Regenerate the query.
        await generateOutputs()
      })
    }
  },
})

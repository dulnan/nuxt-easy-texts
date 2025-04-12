import { fileURLToPath } from 'url'
import { defineNuxtModule, addVitePlugin } from '@nuxt/kit'
import { name, version } from '../package.json'
import textsVitePlugin from './vitePlugin'
import './types'
import type { ModuleOptions } from './module/types/options'
import { ModuleHelper } from './module/classes/ModuleHelper'
import { Collector } from './module/classes/Collector'
import {
  generatorCustom,
  generatorDrupal,
  generatorJson,
  TEMPLATES,
} from './module/templates'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'easyTexts',
    version,
    compatibility: {
      nuxt: '^3.16.0',
    },
  },
  async setup(options, nuxt) {
    const helper = new ModuleHelper(nuxt, import.meta.url, options)
    const collector = new Collector(helper)

    // Add the built-in templates.
    TEMPLATES.forEach((definition) => {
      if (definition.type === 'static') {
        helper.addTemplate(definition)
      } else {
        collector.addTemplate(definition)
      }
    })

    // Add custom generator templates.
    helper.options.generators.forEach((generator) => {
      const resolvedPath = helper.resolveUserPath(generator.outputPath)
      if (generator.generate === 'json') {
        collector.addTemplate(generatorJson(resolvedPath))
      } else if (generator.generate === 'drupal-graphql-texts') {
        collector.addTemplate(generatorDrupal(resolvedPath))
      } else {
        collector.addTemplate(generatorCustom(resolvedPath, generator.generate))
      }
    })

    await collector.init()

    helper.transpile(fileURLToPath(new URL('./runtime', import.meta.url)))
    helper.addPlugin('texts')
    helper.addComposable('useEasyTexts')
    helper.addAlias('#nuxt-easy-texts', helper.paths.moduleBuildDir)
    addVitePlugin(textsVitePlugin())

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
      nuxt.hook('builder:watch', async (event, providedFilePath) => {
        // Hack: This is supposed to be absolute. But it's not. Sometimes.
        // Let's make sure it's really absolute. We have to assume that the path
        // is actually relative to the source directory. If not, HMR will be
        // broken.
        const pathAbsolute = providedFilePath.startsWith('/')
          ? providedFilePath
          : helper.resolvers.src.resolve(providedFilePath)
        // Determine if the extractable texts in the file have changed.
        await collector.handleWatchEvent(event, pathAbsolute)
      })
    }
  },
})

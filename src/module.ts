import { fileURLToPath } from 'url'
import { defineNuxtModule, addBuildPlugin } from '@nuxt/kit'
import { name, version } from '../package.json'
import textsVitePlugin from './build/vitePlugin'
import type { ModuleOptions } from './build/types/options'
import { ModuleHelper } from './build/classes/ModuleHelper'
import { Collector } from './build/classes/Collector'
import {
  generatorCustom,
  generatorDrupal,
  generatorJson,
  TEMPLATES,
} from './build/templates'
import { DevModeHandler } from './build/classes/DevModeHandler'

export type { ModuleOptions }

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
    addBuildPlugin(textsVitePlugin(nuxt))

    helper.applyBuildConfig()

    if (!nuxt.options.dev) {
      return
    }

    const devMode = new DevModeHandler(nuxt, collector, helper)
    devMode.init()
  },
})

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    /**
     * Emitted when texts have been updated.
     */
    'nuxt-easy-texts:reload': undefined
  }
}

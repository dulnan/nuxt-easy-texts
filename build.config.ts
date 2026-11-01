import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['./src/loader.ts', './src/drupal.ts', './src/cli.ts'],
  externals: [
    'pathe',
    'magic-string',
    'micromatch',
    'acorn',
    'devalue',
    'vue/compiler-sfc',
    'unplugin',
    'picomatch',
    '#imports',
    '#nuxt-easy-texts/keys',
    '#nuxt-easy-texts/loader',
  ],
  replace: {
    'process.env.PLAYGROUND_MODULE_BUILD': 'undefined',
  },
})

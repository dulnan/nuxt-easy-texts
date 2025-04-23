import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['./src/loader.ts'],
  externals: [
    'pathe',
    'magic-string',
    'micromatch',
    'acorn',
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

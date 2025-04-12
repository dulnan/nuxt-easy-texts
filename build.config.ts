import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['./src/loader.ts'],
  externals: [
    'pathe',
    'magic-string',
    'micromatch',
    'acorn',
    '#imports',
    '#nuxt-easy-texts/keys',
    '#nuxt-easy-texts/loader',
  ],
})

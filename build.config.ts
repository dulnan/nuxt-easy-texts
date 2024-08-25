import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    '#imports',
    'defu',
    'unplugin',
    'magic-string',
    'estree-walker',
    'acorn',
    'webpack-sources',
    'webpack-virtual-modules',
    '@jridgewell/sourcemap-codec',
    '#nuxt-easy-texts/types',
    '#nuxt-easy-texts/generated-types',
  ],
})

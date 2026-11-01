import { describe, it, expect } from 'vitest'
import { removeDefaultTextsPrefetch } from '../../src/build/helpers/manifest'

const DEFAULTS_ID =
  '../../virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fnuxt-easy-texts%2Fdefaults.js'

describe('removeDefaultTextsPrefetch', () => {
  it('removes the default texts from the dynamic imports of every chunk', () => {
    const manifest = {
      '../../node_modules/nuxt/dist/app/entry.js': {
        dynamicImports: ['pages/index.vue', DEFAULTS_ID, 'layouts/default.vue'],
      },
      'app/easyTexts.loader.ts': { dynamicImports: [DEFAULTS_ID] },
      [DEFAULTS_ID]: {},
    }

    removeDefaultTextsPrefetch(manifest)

    expect(manifest).toEqual({
      '../../node_modules/nuxt/dist/app/entry.js': {
        dynamicImports: ['pages/index.vue', 'layouts/default.vue'],
      },
      'app/easyTexts.loader.ts': { dynamicImports: [] },
      [DEFAULTS_ID]: {},
    })
  })

  it('matches an ID that is not URL-encoded', () => {
    const manifest = {
      entry: { dynamicImports: ['/app/.nuxt/nuxt-easy-texts/defaults.js'] },
    }

    removeDefaultTextsPrefetch(manifest)

    expect(manifest.entry.dynamicImports).toEqual([])
  })

  it('keeps other chunks, including ones with an invalid encoding', () => {
    const manifest = {
      entry: {
        dynamicImports: [
          'components/100%.vue',
          'nuxt-easy-texts/defaults.js.map',
          'my-defaults.js',
        ],
      },
    }

    removeDefaultTextsPrefetch(manifest)

    expect(manifest.entry.dynamicImports).toEqual([
      'components/100%.vue',
      'nuxt-easy-texts/defaults.js.map',
      'my-defaults.js',
    ])
  })
})

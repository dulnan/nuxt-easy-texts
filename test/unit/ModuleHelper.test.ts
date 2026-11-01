import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'pathe'
import type { Nuxt } from 'nuxt/schema'
import { ModuleHelper } from '../../src/build/classes/ModuleHelper'

describe('ModuleHelper patterns', () => {
  let root: string
  let layer: string

  /**
   * A helper for an app with one extra layer, using the given patterns, or the
   * default patterns.
   */
  function createHelper(pattern?: string[]) {
    const nuxt = {
      options: {
        _prepare: false,
        dev: true,
        rootDir: root,
        srcDir: join(root, 'app'),
        serverDir: join(root, 'server'),
        buildDir: join(root, '.nuxt'),
        dir: { app: join(root, 'app') },
        _layers: [
          { config: { rootDir: root, srcDir: join(root, 'app') } },
          { config: { rootDir: layer, srcDir: join(layer, 'app') } },
        ],
      },
    } as unknown as Nuxt

    return new ModuleHelper(nuxt, import.meta.url, {
      generators: [],
      ...(pattern && { pattern }),
    })
  }

  const file = (path: string) => join(root, path)

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'nuxt-easy-texts-'))
    layer = join(root, 'layers/base')
    for (const path of [
      'app/easyTexts.loader.ts',
      'app/components/A.vue',
      'app/error.vue',
      'app/components/skip/B.vue',
      'layers/base/app/components/C.vue',
      'layers/base/app/error.vue',
      'layers/base/app/components/skip/D.vue',
      'server/api/texts.ts',
    ]) {
      mkdirSync(dirname(file(path)), { recursive: true })
      writeFileSync(file(path), '')
    }
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const PATTERN = ['~/components/**/*.vue', '!~/components/skip/**']

  it('resolves aliases in ignore patterns for each layer', () => {
    expect(createHelper(PATTERN).options.pattern).toEqual([
      file('app/components/**/*.vue'),
      file('layers/base/app/components/**/*.vue'),
      '!' + file('app/components/skip/**'),
      '!' + file('layers/base/app/components/skip/**'),
    ])
  })

  it('leaves out ignored files when scanning', async () => {
    expect(await createHelper(PATTERN).getImportPatternFiles()).toEqual([
      file('app/components/A.vue'),
      file('layers/base/app/components/C.vue'),
    ])
  })

  it.each([
    ['app/components/A.vue', true],
    ['layers/base/app/components/C.vue', true],
    ['app/components/skip/B.vue', false],
    ['layers/base/app/components/skip/D.vue', false],
    ['server/api/texts.ts', false],
  ])('matches %s: %s', (path, expected) => {
    expect(createHelper(PATTERN).matchesImportPattern(file(path))).toBe(
      expected,
    )
  })

  it.each(['app/error.vue', 'layers/base/app/error.vue'])(
    'matches %s with the default patterns',
    (path) => {
      expect(createHelper().matchesImportPattern(file(path))).toBe(true)
    },
  )
})

describe('ModuleHelper loader path', () => {
  let root: string

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'nuxt-easy-texts-'))
    for (const path of [
      'app/easyTexts.loader.ts',
      'src/app/easyTexts.loader.ts',
    ]) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), '')
    }
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  /**
   * A helper for an app in the temp root, which is not the working directory.
   */
  function createHelper(srcDir: string, appDir: string) {
    const nuxt = {
      options: {
        _prepare: false,
        dev: true,
        rootDir: root,
        srcDir: join(root, srcDir),
        serverDir: join(root, 'server'),
        buildDir: join(root, '.nuxt'),
        dir: { app: appDir },
        _layers: [{ config: { rootDir: root, srcDir: join(root, srcDir) } }],
      },
    } as unknown as Nuxt

    return new ModuleHelper(nuxt, import.meta.url, { generators: [] })
  }

  it('finds the loader in the absolute app dir (Nuxt 4)', () => {
    expect(createHelper('app', join(root, 'app')).paths.easyTextsLoader).toBe(
      join(root, 'app/easyTexts.loader'),
    )
  })

  // In Nuxt 3, dir.app is the relative 'app', resolved against srcDir.
  it('finds the loader in the relative app dir (Nuxt 3)', () => {
    expect(createHelper('.', 'app').paths.easyTextsLoader).toBe(
      join(root, 'app/easyTexts.loader'),
    )
  })

  it('finds the loader in the relative app dir with a custom srcDir (Nuxt 3)', () => {
    expect(createHelper('src', 'app').paths.easyTextsLoader).toBe(
      join(root, 'src/app/easyTexts.loader'),
    )
  })

  it('names the expected file when the loader is missing', () => {
    expect(() => createHelper('other', 'app')).toThrow(
      `expected ${join(root, 'other/app/easyTexts.loader.ts')}.`,
    )
  })
})

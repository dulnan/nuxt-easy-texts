import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { stringify } from 'devalue'
import { isInstalledFile, runCli } from '../../src/build/merge/cli'
import {
  getBasicAuthHeader,
  readTextsFromUrl,
} from '../../src/build/merge/readTexts'

const fixtureDir = fileURLToPath(new URL('../e2e/fixture', import.meta.url))

const CREDENTIALS = 'editor:se:cret'

/**
 * A page behind Basic auth, with texts in its payload like a Nuxt page.
 * /fallback renders the default texts instead.
 */
const server = createServer((request, response) => {
  if (request.headers.authorization !== getBasicAuthHeader(CREDENTIALS)) {
    response.writeHead(401, { 'WWW-Authenticate': 'Basic' }).end()
    return
  }
  const payload = stringify({
    state: {
      $snuxt_easy_texts_translations: new Map([
        ['en', { 'basic.key': 'Text from the protected page' }],
      ]),
      // As if loading the texts failed for /fallback.
      $snuxt_easy_texts_fallback: request.url === '/fallback' ? ['en'] : [],
    },
  })
  response
    .writeHead(200, { 'Content-Type': 'text/html' })
    .end(
      `<html><body><script type="application/json" data-ssr="true" id="__NUXT_DATA__">${payload}</script></body></html>`,
    )
})
let pageUrl = ''

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  pageUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
})

afterAll(() => {
  server.close()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

/**
 * Runs the CLI and returns its exit code and output.
 */
async function run(args: string[]) {
  const output: string[] = []
  const collect = (...values: unknown[]) => {
    output.push(values.join(' '))
  }
  vi.spyOn(console, 'log').mockImplementation(collect)
  vi.spyOn(console, 'error').mockImplementation(collect)
  const exitCode = await runCli(args, fixtureDir)
  return { exitCode, output: output.join('\n') }
}

describe('getBasicAuthHeader', () => {
  it('only splits at the first colon', () => {
    expect(getBasicAuthHeader('editor:se:cret')).toBe(
      'Basic ' + btoa('editor:se:cret'),
    )
  })

  it('rejects credentials without a colon', () => {
    expect(() => getBasicAuthHeader('editor')).toThrow(
      'The credentials must have the form user:password.',
    )
  })
})

describe('readTextsFromUrl', () => {
  it('sends the credentials', async () => {
    const result = await readTextsFromUrl(pageUrl, { auth: CREDENTIALS })

    expect(result).toEqual({
      language: 'en',
      texts: { 'basic.key': 'Text from the protected page' },
    })
  })

  it('explains how to pass credentials when the page requires them', async () => {
    await expect(readTextsFromUrl(pageUrl)).rejects.toThrow(
      'requires credentials (status 401). Pass them with --auth <user:password> or NUXT_EASY_TEXTS_AUTH.',
    )
  })

  it('reports rejected credentials', async () => {
    await expect(
      readTextsFromUrl(pageUrl, { auth: 'editor:wrong' }),
    ).rejects.toThrow('rejected the credentials (status 401).')
  })

  it('refuses a page that rendered the default texts', async () => {
    await expect(
      readTextsFromUrl(pageUrl + 'fallback', { auth: CREDENTIALS }),
    ).rejects.toThrow(
      'The page rendered the default texts for "en", because loading the texts failed.',
    )
  })

  it('rejects credentials in the URL', async () => {
    const withCredentials = pageUrl.replace('://', '://editor:secret@')

    await expect(readTextsFromUrl(withCredentials)).rejects.toThrow(
      'Pass the credentials with --auth or NUXT_EASY_TEXTS_AUTH, not in the URL.',
    )
  })
})

describe('runCli', () => {
  it.each([[[]], [['help']]])('prints the usage for %j', async (args) => {
    const { exitCode, output } = await run(args)

    expect(exitCode).toBe(0)
    expect(output).toContain('Usage: nuxt easy-texts merge <url|file>')
  })

  it.each([
    [['foo'], 'Unknown command "foo".'],
    [['merge'], 'Missing the URL or file to read the texts from.'],
    [['merge', pageUrl, '--foo'], "Unknown option '--foo'"],
  ])('prints an error and the usage for %j', async (args, message) => {
    const { exitCode, output } = await run(args)

    expect(exitCode).toBe(1)
    expect(output).toContain(message)
    expect(output).toContain('Usage: nuxt easy-texts merge <url|file>')
  })

  it('prints why fetching the page failed', async () => {
    // A port that nothing listens on anymore.
    const closed = createServer()
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve))
    const { port } = closed.address() as AddressInfo
    await new Promise((resolve) => closed.close(resolve))
    const url = `http://127.0.0.1:${port}/`

    const { exitCode, output } = await run(['merge', url, '--dry-run'])

    expect(exitCode).toBe(1)
    expect(output).toContain(
      `Fetching ${url} failed. connect ECONNREFUSED 127.0.0.1:${port}`,
    )
  })

  it('reads the credentials from --auth', async () => {
    const { exitCode, output } = await run([
      'merge',
      pageUrl,
      '--auth',
      CREDENTIALS,
      '--dry-run',
    ])

    expect(exitCode).toBe(0)
    expect(output).toContain('+ "Text from the protected page"')
  })

  it('reads the credentials from NUXT_EASY_TEXTS_AUTH', async () => {
    vi.stubEnv('NUXT_EASY_TEXTS_AUTH', CREDENTIALS)
    const { exitCode, output } = await run(['merge', pageUrl, '--dry-run'])

    expect(exitCode).toBe(0)
    expect(output).toContain('+ "Text from the protected page"')
  })

  it('prefers --auth over NUXT_EASY_TEXTS_AUTH', async () => {
    vi.stubEnv('NUXT_EASY_TEXTS_AUTH', 'editor:wrong')
    const { exitCode } = await run([
      'merge',
      pageUrl,
      '--auth',
      CREDENTIALS,
      '--dry-run',
    ])

    expect(exitCode).toBe(0)
  })
})

describe('isInstalledFile', () => {
  it.each([
    ['/app/node_modules/my-layer/app/pages/index.vue', true],
    ['/app/node_modules/.c12/github_org_layer/app/pages/index.vue', true],
    ['C:\\app\\node_modules\\my-layer\\app\\pages\\index.vue', true],
    ['/app/layers/base/app/pages/index.vue', false],
    ['/app/app/components/node_modules_list.vue', false],
  ])('%s: %s', (filePath, expected) => {
    expect(isInstalledFile(filePath)).toBe(expected)
  })
})

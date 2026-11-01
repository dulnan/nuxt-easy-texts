import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  createPage,
  fetch,
  setup,
  url,
  useTestContext,
} from '@nuxt/test-utils/e2e'

/**
 * Requests a page like a browser does. Nuxt only renders error.vue for HTML
 * requests.
 */
async function getPage(path: string) {
  const response = await fetch(path, { headers: { Accept: 'text/html' } })
  return { status: response.status, html: await response.text() }
}

/**
 * Returns the text of the element with the given data-testid in the HTML.
 */
function getText(html: string, testId: string): string | undefined {
  const match = html.match(new RegExp(`data-testid="${testId}"[^>]*>([^<]*)<`))
  return match?.[1]?.trim()
}

/**
 * Returns the names of the built client chunks that contain the given text.
 */
async function findClientChunks(text: string): Promise<string[]> {
  const outputDir = useTestContext().nuxt!.options.nitro.output!.dir!
  const dir = join(outputDir, 'public', '_nuxt')
  const names = (await readdir(dir)).filter((name) => name.endsWith('.js'))
  const found: string[] = []
  for (const name of names) {
    if ((await readFile(join(dir, name), 'utf8')).includes(text)) {
      found.push(name)
    }
  }
  return found
}

describe('default texts fallback e2e', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixture', import.meta.url)),
    build: true,
    browser: true,
  })

  it('renders the default texts when loading the texts fails', async () => {
    const { status, html } = await getPage('/?language=unavailable')

    expect(status).toBe(200)
    expect(getText(html, 'basic')).toBe('Basic default text')
    expect(getText(html, 'plural')).toBe('2 items')
  })

  it('renders the error page with the default texts when loading the texts fails', async () => {
    const { status, html } = await getPage(
      '/does-not-exist?language=unavailable',
    )

    expect(status).toBe(404)
    expect(getText(html, 'error-title')).toBe('Something went wrong')
  })

  it('renders the error page with the loaded texts', async () => {
    const { status, html } = await getPage('/does-not-exist')

    expect(status).toBe(404)
    expect(getText(html, 'error-title')).toBe('[LOADED] Something went wrong')
  })

  it('puts the default texts in one chunk that pages do not reference', async () => {
    const chunks = await findClientChunks('Basic default text')
    const { html } = await getPage('/')

    expect(chunks).toHaveLength(1)
    expect(html).not.toContain(chunks[0])
  })

  it('loads the default texts in the browser only when loading the texts fails', async () => {
    const [chunk] = await findClientChunks('Basic default text')
    const requested: string[] = []
    const page = await createPage()
    page.on('request', (request) => {
      requested.push(new URL(request.url()).pathname.split('/').pop()!)
    })

    await page.goto(url('/'), { waitUntil: 'hydration' })
    expect(await page.getByTestId('basic').textContent()).toBe(
      '[LOADED] Basic text',
    )
    expect(requested).not.toContain(chunk)

    await page.evaluate(() =>
      (
        document.querySelector('#__nuxt') as any
      ).__vue_app__.config.globalProperties.$router.push(
        '/?language=unavailable',
      ),
    )
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="basic"]')?.textContent ===
        'Basic default text',
    )
    expect(requested).toContain(chunk)

    await page.close()
  })
})

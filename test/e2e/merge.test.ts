import { cp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { setup, url } from '@nuxt/test-utils/e2e'
import { runCli } from '../../src/build/merge/cli'

const fixtureDir = fileURLToPath(new URL('./fixture', import.meta.url))

// The merge writes to a copy of the fixture. It is at the same depth as the
// fixture, so that the fixture's relative imports resolve.
const copyDir = fileURLToPath(new URL('./.tmp', import.meta.url))

/**
 * Runs the CLI in the copy of the fixture and returns its exit code and
 * output.
 */
async function run(args: string[]) {
  const output: string[] = []
  const log = vi
    .spyOn(console, 'log')
    .mockImplementation((...values) => output.push(values.join(' ')))
  const error = vi
    .spyOn(console, 'error')
    .mockImplementation((...values) => output.push(values.join(' ')))
  try {
    const exitCode = await runCli(args, copyDir)
    return { exitCode, output: output.join('\n') }
  } finally {
    log.mockRestore()
    error.mockRestore()
  }
}

describe('nuxt easy-texts merge e2e', async () => {
  await setup({ rootDir: fixtureDir, build: true })

  afterAll(() => rm(copyDir, { recursive: true, force: true }))

  it('replaces the default texts with the texts of the rendered page', async () => {
    await rm(copyDir, { recursive: true, force: true })
    await cp(join(fixtureDir, 'app'), join(copyDir, 'app'), {
      recursive: true,
    })
    await cp(
      join(fixtureDir, 'nuxt.config.ts'),
      join(copyDir, 'nuxt.config.ts'),
    )

    const merged = await run(['merge', url('/')])
    const page = await readFile(join(copyDir, 'app/pages/index.vue'), 'utf8')
    const again = await run(['merge', url('/'), '--dry-run'])

    expect(merged.exitCode).toBe(0)
    expect(page).toContain(`$texts('basic.key', '[LOADED] Basic text')`)
    expect(page).toContain(
      `$textsPlural('plural.key', 2, '[LOADED] One item', '[LOADED] @count items')`,
    )
    expect(again.output).toContain('0 default texts would change')
  })
})

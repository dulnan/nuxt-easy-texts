import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { relative, resolve } from 'pathe'
import { loadNuxt } from '@nuxt/kit'
import colors from 'picocolors'
import { ModuleHelper } from '../classes/ModuleHelper'
import type { ModuleOptions } from '../types/options'
import { mergeFile, type LiveTexts } from './mergeFile'
import { AUTH_ENV, readTextsFromFile, readTextsFromUrl } from './readTexts'

const USAGE = `Usage: nuxt easy-texts merge <url|file> [options]

Replaces the default texts in the code with the live texts.

  <url>   A page of the running app, e.g. https://www.example.com/de. The
          texts are read from the payload of the rendered page.
  <file>  A JSON file with the texts, keyed by full key, as a loader returns
          them.

Options:
  --language <code>       The language to read from the page, if it has
                          several.
  --auth <user:password>  Basic auth credentials for the page. Defaults to
                          the ${AUTH_ENV} environment variable, which
                          can also be set in the app's .env file.
  --dry-run               Show the changes without writing them.
  --cwd <dir>             The directory of the Nuxt app.
`

/**
 * Returns the files that the module scans for texts, with the app's
 * easyTexts options.
 *
 * Loading the Nuxt config also loads the app's .env file.
 */
async function loadApp(cwd: string): Promise<{
  files: string[]
  globalTexts: NonNullable<ModuleOptions['globalTexts']>
}> {
  const nuxt = await loadNuxt({ cwd, ready: false, dev: false })
  try {
    const options = (nuxt.options as { easyTexts?: ModuleOptions })
      .easyTexts ?? { generators: [] }
    const helper = new ModuleHelper(nuxt, import.meta.url, options)
    return {
      files: await helper.getImportPatternFiles(),
      globalTexts: helper.options.globalTexts,
    }
  } finally {
    await nuxt.close()
  }
}

async function merge(
  cwd: string,
  source: string,
  options: { language?: string; auth?: string; dryRun: boolean },
) {
  const { files, globalTexts } = await loadApp(cwd)

  let texts: LiveTexts
  if (/^https?:\/\//.test(source)) {
    const result = await readTextsFromUrl(source, {
      language: options.language,
      auth: options.auth ?? process.env[AUTH_ENV],
    })
    texts = result.texts
    console.log(
      `Read ${Object.keys(texts).length} texts in "${result.language}" from ${source}`,
    )
  } else {
    texts = await readTextsFromFile(resolve(cwd, source))
    console.log(`Read ${Object.keys(texts).length} texts from ${source}`)
  }

  let changeCount = 0
  const missing = new Set<string>()

  for (const filePath of files) {
    const code = await readFile(filePath, 'utf8')
    const result = mergeFile(filePath, code, texts)
    result.missing.forEach((key) => missing.add(key))
    if (!result.code) {
      continue
    }
    console.log('\n' + colors.bold(relative(cwd, filePath)))
    for (const change of result.changes) {
      console.log(
        `  ${colors.gray(String(change.line).padStart(4))} ${change.fullKey}\n` +
          `       ${colors.red('- ' + JSON.stringify(change.before))}\n` +
          `       ${colors.green('+ ' + JSON.stringify(change.after))}`,
      )
    }
    changeCount += result.changes.length
    if (!options.dryRun) {
      await writeFile(filePath, result.code)
    }
  }

  const globalChanged = Object.entries(globalTexts)
    .filter(
      ([key, value]) =>
        Object.hasOwn(texts, key) &&
        JSON.stringify(texts[key]) !== JSON.stringify(value),
    )
    .map(([key]) => key)
  console.log(
    `\n${changeCount} default texts ${options.dryRun ? 'would change' : 'changed'} in ${files.length} scanned files.`,
  )
  if (missing.size) {
    console.log(
      `${missing.size} keys have no live text: ${[...missing].join(', ')}`,
    )
  }
  if (globalChanged.length) {
    console.log(
      `${globalChanged.length} keys from globalTexts in nuxt.config were not updated: ${globalChanged.join(', ')}`,
    )
  }
}

/**
 * Prints an error about the arguments, followed by the usage.
 */
function usageError(message: string): number {
  console.error(colors.red(message) + '\n')
  console.log(USAGE)
  return 1
}

/**
 * Runs the CLI with the given arguments and returns the exit code.
 *
 * nuxt runs the command in the directory given with --cwd, and also passes
 * the option on. The option is therefore accepted and ignored.
 *
 * nuxt answers --help itself and never passes it on, so the usage is printed
 * without arguments and for "help" instead.
 */
export async function runCli(args: string[], cwd: string): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        language: { type: 'string' },
        auth: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        cwd: { type: 'string' },
      },
    })
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error))
  }
  const { positionals, values } = parsed
  const [command, source] = positionals

  if (!command || command === 'help') {
    console.log(USAGE)
    return 0
  }
  if (command !== 'merge') {
    return usageError(`Unknown command "${command}".`)
  }
  if (!source) {
    return usageError('Missing the URL or file to read the texts from.')
  }

  try {
    await merge(cwd, source, {
      language: values.language,
      auth: values.auth,
      dryRun: values['dry-run'],
    })
    return 0
  } catch (error) {
    console.error(
      colors.red(error instanceof Error ? error.message : String(error)),
    )
    return 1
  }
}

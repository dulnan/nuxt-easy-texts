import { readFile } from 'node:fs/promises'
import { parse } from 'devalue'
import {
  FALLBACK_STATE,
  TRANSLATIONS_STATE,
} from '../../runtime/helpers/constants'
import type { LiveTexts } from './mergeFile'

/**
 * The environment variable with the Basic auth credentials, as user:password.
 */
export const AUTH_ENV = 'NUXT_EASY_TEXTS_AUTH'

/**
 * The prefix Nuxt adds to the key of every useState() in the payload.
 */
const STATE_PREFIX = '$s'

/**
 * Parses a Nuxt payload.
 *
 * Nuxt and other modules serialize some values with their own reducers, e.g.
 * refs or errors. Parsing them needs a reviver of the same name. The texts
 * don't depend on any of them, so every unknown type is revived as is.
 */
export function parsePayload(serialized: string): Record<string, unknown> {
  const revivers: Record<string, (value: unknown) => unknown> = {}
  for (;;) {
    try {
      return parse(serialized, revivers)
    } catch (error) {
      const match =
        error instanceof Error && error.message.match(/^Unknown type (.+)$/)
      if (!match || match[1]! in revivers) {
        throw error
      }
      revivers[match[1]!] = (value) => value
    }
  }
}

/**
 * The state key under which versions 2.1.0 to 2.2.0 kept the loaded texts, as
 * an object keyed by language. These versions have no fallback to the default
 * texts: if loading fails, the page fails, so its texts are always live.
 */
const LEGACY_TRANSLATIONS_STATE = 'nuxt_easy_texts'

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Whether the value is an object of texts keyed by language.
 */
function isTextsByLanguage(value: unknown): value is Record<string, LiveTexts> {
  return isObject(value) && Object.values(value).every(isObject)
}

/**
 * Returns the loaded texts from a Nuxt payload, keyed by language.
 *
 * Also reads the payload of a page rendered by an older version, so that the
 * command works before the new version is deployed.
 */
export function getTextsFromPayload(
  payload: Record<string, unknown>,
): Map<string, LiveTexts> {
  const state = isObject(payload.state) ? payload.state : {}
  const translations = state[STATE_PREFIX + TRANSLATIONS_STATE]
  if (translations instanceof Map) {
    return translations
  }

  const legacy = state[STATE_PREFIX + LEGACY_TRANSLATIONS_STATE]
  if (isTextsByLanguage(legacy)) {
    return new Map(Object.entries(legacy))
  }

  throw new Error(
    'The page has no texts in its payload. Server-side rendering must be enabled, and the page must use nuxt-easy-texts 2.1.0 or newer.',
  )
}

/**
 * Returns the languages for which the page rendered the default texts,
 * because loading the texts failed.
 */
export function getFallbackLanguages(
  payload: Record<string, unknown>,
): string[] {
  const state = payload.state as Record<string, unknown> | undefined
  const languages = state?.[STATE_PREFIX + FALLBACK_STATE]
  return Array.isArray(languages) ? languages : []
}

/**
 * Picks the texts of one language.
 */
export function pickLanguage(
  texts: Map<string, LiveTexts>,
  language?: string,
): { language: string; texts: LiveTexts } {
  if (language) {
    const found = texts.get(language)
    if (!found) {
      throw new Error(
        `The page has no texts for language "${language}", only for: ${[...texts.keys()].join(', ')}.`,
      )
    }
    return { language, texts: found }
  }
  if (texts.size === 0) {
    throw new Error('The page loaded no texts.')
  }
  if (texts.size !== 1) {
    throw new Error(
      `The page has texts for several languages (${[...texts.keys()].join(', ')}). Pick one with --language.`,
    )
  }
  const [entry] = texts.entries()
  return { language: entry![0], texts: entry![1] }
}

/**
 * Returns the Authorization header for Basic auth credentials given as
 * user:password. Only the first colon separates the two, so the password can
 * contain colons.
 */
export function getBasicAuthHeader(auth: string): string {
  if (!auth.includes(':')) {
    throw new Error('The credentials must have the form user:password.')
  }
  return 'Basic ' + Buffer.from(auth, 'utf8').toString('base64')
}

/**
 * Reads the texts that a page of a running Nuxt app rendered, from the
 * payload in its HTML.
 */
export async function readTextsFromUrl(
  url: string,
  options: { language?: string; auth?: string } = {},
): Promise<{ language: string; texts: LiveTexts }> {
  // fetch() rejects a URL with credentials.
  const { username, password } = new URL(url)
  if (username || password) {
    throw new Error(
      `Pass the credentials with --auth or ${AUTH_ENV}, not in the URL.`,
    )
  }

  const headers: Record<string, string> = { Accept: 'text/html' }
  if (options.auth) {
    headers.Authorization = getBasicAuthHeader(options.auth)
  }
  let response: Response
  try {
    response = await fetch(url, { headers })
  } catch (error) {
    // fetch() only says "fetch failed", the reason is its cause.
    throw new Error(`Fetching ${url} failed.`, { cause: error })
  }

  if (response.status === 401) {
    throw new Error(
      options.auth
        ? `${url} rejected the credentials (status 401).`
        : `${url} requires credentials (status 401). Pass them with --auth <user:password> or ${AUTH_ENV}.`,
    )
  }
  if (!response.ok) {
    throw new Error(`Fetching ${url} failed with status ${response.status}.`)
  }
  const html = await response.text()
  const match = html.match(
    /<script\b[^>]*\bid="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )
  if (!match?.[1]) {
    throw new Error(`The page at ${url} has no Nuxt payload.`)
  }
  const payload = parsePayload(match[1])
  const result = pickLanguage(getTextsFromPayload(payload), options.language)
  if (getFallbackLanguages(payload).includes(result.language)) {
    throw new Error(
      `The page rendered the default texts for "${result.language}", because loading the texts failed. Try again once the page loads its texts.`,
    )
  }
  return result
}

/**
 * Reads the texts from a JSON file in the shape a loader returns.
 */
export async function readTextsFromFile(path: string): Promise<LiveTexts> {
  const texts: unknown = JSON.parse(await readFile(path, 'utf8'))
  if (!texts || typeof texts !== 'object' || Array.isArray(texts)) {
    throw new Error(
      `${path} must contain an object of texts, keyed by full key.`,
    )
  }
  return texts as LiveTexts
}

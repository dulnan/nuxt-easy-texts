import fs from 'node:fs'
import { useLogger } from '@nuxt/kit'

/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

export const fileExists = (
  path?: string,
  extensions = ['ts'],
): string | null => {
  if (!path) {
    return null
  } else if (fs.existsSync(path)) {
    // If path already contains/forces the extension
    return path
  }

  const extension = extensions.find((extension) =>
    fs.existsSync(`${path}.${extension}`),
  )

  return extension ? `${path}.${extension}` : null
}

export const logger = useLogger('nuxt-easy-texts')

/**
 * How the generated default texts appear at the end of a chunk ID in the
 * client manifest.
 */
const DEFAULT_TEXTS_FILE = 'nuxt-easy-texts/defaults.js'

function decode(id: string): string {
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

/**
 * Removes the default texts from the dynamic imports in the client manifest.
 *
 * Nuxt adds a prefetch hint to every page for each dynamic import, so browsers
 * would download the default texts in the background on every page. They are
 * only needed when loading the texts fails, and the runtime imports them then.
 * Nuxt removes some of its own chunks the same way, e.g. global components.
 *
 * The ID of a virtual template is URL-encoded, e.g.
 * "virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fnuxt-easy-texts%2Fdefaults.js".
 */
export function removeDefaultTextsPrefetch(
  manifest: Record<string, { dynamicImports?: string[] }>,
): void {
  for (const chunk of Object.values(manifest)) {
    chunk.dynamicImports = chunk.dynamicImports?.filter(
      (id) => !decode(id).endsWith(DEFAULT_TEXTS_FILE),
    )
  }
}

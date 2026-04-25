import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**'],
      exclude: ['src/runtime/components/**'],
    },
    projects: [
      {
        // Tests run with import.meta.dev = true so the dev-mode fallback
        // branches in src/runtime/helpers/textsFunctions.ts execute. Those
        // branches are import.meta.dev-gated to tree-shake in production
        // builds, but unit tests rely on them firing.
        define: {
          'import.meta.dev': 'true',
        },
        test: {
          name: 'unit',
          include: ['test/{e2e,unit}/*.{test,spec}.ts'],
          environment: 'node',
          server: {
            deps: {
              inline: [/jiti/, /@nuxt\/test-utils/],
            },
          },
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})

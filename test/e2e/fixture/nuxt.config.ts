export default defineNuxtConfig({
  ssr: true,
  modules: ['../../../src/module'],

  easyTexts: {
    generators: [
      {
        outputPath: './texts.json',
        generate: 'json',
      },
    ],
    experimental: {
      languageOverride: true,
    },
  },

  // Disable sourcemaps for tests to avoid conflicts with transform plugin
  sourcemap: {
    client: false,
    server: false,
  },

  compatibilityDate: '2025-04-12',
})

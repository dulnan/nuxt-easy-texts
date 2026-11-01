export default defineNuxtConfig({
  modules: ['../../src/module'],

  easyTexts: {
    generators: [
      {
        outputPath: './fragment.easyTexts.graphql',
        generate: 'drupal-graphql-texts',
      },
    ],
    globalTexts: {
      learnMore: 'Learn more',
    },
  },

  runtimeConfig: {
    // The Drupal site in ../drupal. Can be changed with NUXT_DRUPAL_URL.
    drupalUrl: 'http://nuxt-easy-texts.ddev.site',
  },

  routeRules: {
    '/': { redirect: '/en' },
  },

  typescript: {
    strict: true,
    // .nuxtrc includes the whole repo in the type check, which is meant for
    // the module itself. This app only checks its own files.
    includeWorkspace: false,
  },

  compatibilityDate: '2026-10-31',
})

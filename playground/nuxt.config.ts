export default defineNuxtConfig({
  ssr: false,
  modules: ['../src/module'],

  imports: {
    autoImport: false,
  },

  app: {
    head: {
      viewport:
        'width=device-width, height=device-height, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0',
    },
  },

  easyTexts: {
    generators: [
      {
        outputPath: './texts.json',
        generate: 'json',
      },
      {
        outputPath: './fragment.easyTexts.graphql',
        generate: 'drupal-graphql-texts',
      },
    ],
    globalTexts: { homepage: 'Homepage' },
  },
})

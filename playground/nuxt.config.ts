export default defineNuxtConfig({
  ssr: true,
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
      {
        outputPath: './texts.txt',
        generate: (extractions) => {
          return extractions
            .map((v) => {
              if (v.type === 'text') {
                return `${v.fullKey}: ${v.defaultText}`
              }
              return `${v.fullKey}: ${v.singular} | ${v.plural}`
            })
            .join('\n')
        },
      },
    ],
    globalTexts: { learnMore: 'Learn more' },
  },

  compatibilityDate: '2024-08-25',
})
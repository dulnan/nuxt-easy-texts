import withNuxt from './playground/.nuxt/eslint.config.mjs'
import prettier from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default withNuxt({
  plugins: {
    prettier,
  },
  rules: {
    ...eslintConfigPrettier.rules,
    ...eslintPluginPrettierRecommended.rules,
  },
})
  .override('nuxt/typescript/rules', {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  })
  .overrideRules({
    'vue/multi-word-component-names': 'off',
  })

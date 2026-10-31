import withNuxt from './playground/.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt({
  rules: {
    // Formatting is handled by oxfmt; turn off rules that would conflict.
    ...eslintConfigPrettier.rules,
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

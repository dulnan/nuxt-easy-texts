import withNuxt from './playground/.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'
import oxlint from 'eslint-plugin-oxlint'

// Linting runs in two passes: `oxlint && eslint`. Oxlint runs every rule it
// supports (see .oxlintrc.json); ESLint only runs what oxlint can't, mainly the
// Vue template rules and the Nuxt rules.
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
  // Must come last: turns off every rule that oxlint already runs.
  .append(await oxlint.buildFromConfigFile('./.oxlintrc.json'))
  // Oxlint can't see template usage, so it skips no-unused-vars in .vue files.
  // eslint-plugin-oxlint keeps the rule in ESLint for .vue only for top-level
  // oxlint rules, not for overrides, so it has to be turned back on here.
  .append({
    name: 'nuxt-easy-texts/vue-unused-vars',
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          vars: 'all',
          varsIgnorePattern: '^_',
        },
      ],
    },
  })

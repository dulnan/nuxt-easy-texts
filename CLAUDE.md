# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

nuxt-easy-texts is a Nuxt 3 module for key-based text/translation management. It extracts translatable text keys from source code at build time and loads translations at runtime from a user-defined loader.

## Commands

```bash
# Development
npm run dev              # Start playground dev server
npm run dev:prepare      # Prepare module for development (run first)
npm run dev:build        # Build playground for production
npm run dev:start        # Start built playground server

# Quality
npm run lint             # Lint src/ with ESLint
npm run lint:fix         # Lint and auto-fix
npm run typecheck        # Type check module and playground
npm run prettier         # Check formatting
npm run prettier:fix     # Auto-format

# Build
npm run prepack          # Build module for distribution
```

## Architecture

### Build-time Text Extraction

The module scans source files for `$texts()` and `$textsPlural()` calls, extracting keys and default texts:

1. **Collector** (`src/build/classes/Collector.ts`) - Manages file collection and extraction state
2. **CollectedFile** (`src/build/classes/CollectedFile.ts`) - Parses individual files for text calls
3. **ModuleHelper** (`src/build/classes/ModuleHelper.ts`) - Nuxt integration utilities
4. **DevModeHandler** (`src/build/classes/DevModeHandler.ts`) - Hot reload support in dev mode

### Vite Plugin Transform

`src/build/vitePlugin/index.ts` strips default texts from compiled output:
- `$texts('key', 'Default')` → `$texts('key')`
- `$textsPlural('key', count, 'One', '@count items')` → `$textsPlural('key', count)`

This ensures builds contain only keys, requiring runtime loading.

### Runtime

- **Plugin** (`src/runtime/plugins/texts.ts`) - Initializes loader, provides `$texts`/`$textsPlural` globally
- **Composable** (`src/runtime/composables/useEasyTexts.ts`) - Alternative access supporting language overrides
- **Loader** (`src/loader.ts`) - User defines `~/app/easyTexts.loader.ts` to load translations

### Output Generators

Templates in `src/build/templates/definitions/` generate output files:
- `generatorJson.ts` - JSON extraction output
- `generatorDrupal.ts` - GraphQL fragment for drupal/texts module
- `generatorCustom.ts` - User-provided generate functions

### Key Concepts

- **Extraction**: A parsed `$texts`/`$textsPlural` call with key, context, and default text
- **Context**: Optional namespace prefix in keys (e.g., `cart.addButton` has context `cart`)
- **TextsState**: Runtime map of keys to loaded translations
- **Language Override**: `<EasyTextsLanguageOverride>` component for partial page translation

## Module Configuration

Configure in `nuxt.config.ts` under `easyTexts`:
- `pattern` - Glob patterns for files to scan
- `generators` - Array of output configurations
- `globalTexts` - Static texts defined in config
- `experimental.languageOverride` - Enable override component
- `experimental.advancedDebug` - Enable debug overlay component

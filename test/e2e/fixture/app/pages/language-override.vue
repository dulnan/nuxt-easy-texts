<template>
  <div>
    <h1>Language Override Tests</h1>

    <!-- Text in default language (en) -->
    <p data-testid="default-lang-text">
      {{ $texts('override.test', 'Default override text') }}
    </p>

    <!-- Text inside language override (de) using child components -->
    <!-- The override only works when useEasyTexts() is called INSIDE the slot -->
    <EasyTextsLanguageOverride language="de" data-testid="override-wrapper">
      <p data-testid="override-text">
        <OverrideText />
      </p>
      <p data-testid="override-plural">
        <OverridePlural />
      </p>
    </EasyTextsLanguageOverride>

    <!-- Test with custom tag -->
    <EasyTextsLanguageOverride
      language="de"
      tag="section"
      data-testid="override-section"
    >
      <p data-testid="section-text">
        <OverrideDebugText />
      </p>
    </EasyTextsLanguageOverride>

    <!-- Another text in default language after override -->
    <p data-testid="after-override-text">
      {{ $texts('debug.test', 'Default debug text') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useEasyTexts } from '#imports'

const { $texts } = useEasyTexts()
</script>

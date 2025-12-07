<template>
  <div>
    <!-- Test 1: Basic $texts -->
    <p data-testid="basic">{{ $texts('basic.key', 'Basic default text') }}</p>

    <!-- Test 2: Duplicate identical $texts calls (regression test) -->
    <p data-testid="duplicate-1">
      {{ $texts('duplicate.key', 'Duplicate text') }}
    </p>
    <p data-testid="duplicate-2">
      {{ $texts('duplicate.key', 'Duplicate text') }}
    </p>
    <p data-testid="duplicate-3">
      {{ $texts('duplicate.key', 'Duplicate text') }}
    </p>

    <!-- Test 3: $texts with special characters like 40% -->
    <p data-testid="percentage">
      {{ $texts('percentage.key', 'Enter 40% here') }}
    </p>

    <!-- Test 4: $textsPlural -->
    <p data-testid="plural">
      {{ $textsPlural('plural.key', 2, 'One item', '@count items') }}
    </p>

    <!-- Test 5: Duplicate identical $textsPlural calls (regression test) -->
    <p data-testid="plural-duplicate-1">
      {{ $textsPlural('plural.duplicate', 3, 'One thing', '@count things') }}
    </p>
    <p data-testid="plural-duplicate-2">
      {{ $textsPlural('plural.duplicate', 3, 'One thing', '@count things') }}
    </p>

    <!-- Test 6: $texts with single replacement -->
    <p data-testid="replacement-single">
      {{ $texts('greeting.key', 'Hello @name!', { '@name': userName }) }}
    </p>

    <!-- Test 7: $texts with multiple replacements -->
    <p data-testid="replacement-multiple">
      {{
        $texts('greeting.complex', 'Welcome @name to @place!', {
          '@name': userName,
          '@place': placeName,
        })
      }}
    </p>

    <!-- Test 8: $texts with replacements containing special characters -->
    <p data-testid="replacement-special">
      {{
        $texts('price.key', 'Price: @price (@discount off)', {
          '@price': '$99.99',
          '@discount': '20%',
        })
      }}
    </p>

    <!-- Test 9: $textsPlural with replacements (singular) -->
    <p data-testid="plural-replacement-singular">
      {{
        $textsPlural(
          'items.user',
          1,
          '@name has one item',
          '@name has @count items',
          {
            '@name': userName,
          },
        )
      }}
    </p>

    <!-- Test 10: $textsPlural with replacements (plural) -->
    <p data-testid="plural-replacement-plural">
      {{
        $textsPlural(
          'items.user',
          5,
          '@name has one item',
          '@name has @count items',
          {
            '@name': userName,
          },
        )
      }}
    </p>

    <!-- Test 11: $textsPlural with multiple replacements -->
    <p data-testid="plural-replacement-complex">
      {{
        $textsPlural(
          'cart.summary',
          3,
          '@user: one product (@price)',
          '@user: @count products (@price)',
          {
            '@user': userName,
            '@price': '$150.00',
          },
        )
      }}
    </p>

    <!-- Test 12: Duplicate $texts with replacements (regression test) -->
    <p data-testid="replacement-duplicate-1">
      {{ $texts('greeting.key', 'Hello @name!', { '@name': userName }) }}
    </p>
    <p data-testid="replacement-duplicate-2">
      {{ $texts('greeting.key', 'Hello @name!', { '@name': userName }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useEasyTexts } from '#imports'

const { $texts, $textsPlural } = useEasyTexts()

// Test data
const userName = 'Alice'
const placeName = 'Wonderland'
</script>

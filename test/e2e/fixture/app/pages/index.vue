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

    <!--
      Tests 13-15: $texts/$textsPlural inside <script setup> WITH replacements.
      Regression test for the double-transform bug: the vite plugin's
      transform hook runs both on the parent .vue file and on its
      ?vue&type=script sub-module. Without the idempotence guard, the
      second pass strips the replacements arg.
    -->
    <p data-testid="script-replacement-single">{{ scriptGreeting }}</p>
    <p data-testid="script-replacement-plural-singular">
      {{ scriptItemsSingular }}
    </p>
    <p data-testid="script-replacement-plural-many">
      {{ scriptItemsMany }}
    </p>

    <!-- Tests 16-17: backtick default texts with replacements. -->
    <p data-testid="backtick-replacement">{{ backtickGreeting }}</p>
    <p data-testid="backtick-plural">{{ backtickItems }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEasyTexts } from '#imports'

const { $texts, $textsPlural } = useEasyTexts()

// Test data
const userName = 'Alice'
const placeName = 'Wonderland'

// Calls inside <script setup> with replacements — these end up in the
// ?vue&type=script sub-module and trigger the double-transform path.
const scriptGreeting = computed(() =>
  $texts('greeting.key', 'Hello @name!', { '@name': userName }),
)

const scriptItemsSingular = computed(() =>
  $textsPlural(
    'items.user',
    1,
    '@name has one item',
    '@name has @count items',
    {
      '@name': userName,
    },
  ),
)

const scriptItemsMany = computed(() =>
  $textsPlural(
    'items.user',
    5,
    '@name has one item',
    '@name has @count items',
    {
      '@name': userName,
    },
  ),
)

// Backtick (template literal) default texts with replacements. The collector
// accepts template literals as default texts, so the vite plugin has to strip
// them too. When it doesn't, the call ships untransformed and the production
// runtime - whose signature takes the replacements as the second argument -
// reads the default text as the replacements and silently drops the real ones.
//
// These use their own keys so a failure here can't be masked by another test's
// translation.
//
// NOTE: never write a literal call expression in a comment anywhere in this
// fixture. The collector scans the raw file text, so it gets picked up as a
// real call and fails validation on its non-literal arguments.
const backtickGreeting = computed(() =>
  $texts('backtick.key', `Hi @name!`, { '@name': userName }),
)

const backtickItems = computed(() =>
  $textsPlural(
    'backtick.plural',
    4,
    `@name has one thing`,
    `@name has @count things`,
    {
      '@name': userName,
    },
  ),
)
</script>

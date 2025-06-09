<template>
  <div>
    <h1>{{ $texts('homepageTitle', 'Welcome to our homepage!') }}</h1>

    <section :aria-label="$texts('wrappedAria', 'This is a section')">
      {{ $texts('wrappedAriaContent', 'This is some content in the wrapper') }}
      <div>
        <input
          type="text"
          :placeholder="$texts('inputPlaceholder', 'Input Placeholder')"
        />
        <input type="submit" :value="$texts('inputSubmitValue', 'Submit')" />
      </div>
      <button @click="count--">
        {{ $texts('buttonDecrement', 'Remove 1') }}
      </button>
      <button @click="count++">
        {{ $texts('buttonIncrement', 'Add 1') }}
      </button>
      <label>
        <div>Name</div>
        <input type="text" v-model="name" />
      </label>
      <h3>{{ text }}</h3>
      <p>{{ textWithQuotes }}</p>
      <p>{{ textWithBrackets }}</p>
      <p>{{ completelyWeirdText }}</p>
      <div>
        <div>
          {{
            $texts('singleReplacement', 'The current name is "@name"', {
              '@name': name,
            })
          }}
        </div>
        <div>
          {{
            $textsPlural(
              'pluralReplacements',
              count,
              'There is one person named "@name"',
              'The are @count people named "@name"',
              {
                '@name': name,
              },
            )
          }}
        </div>
      </div>
    </section>
    <div style="height: 150vh" />
    <div style="margin: 2rem 0">
      <div>{{ $texts('footerCopyright', 'Copyright 2025') }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useEasyTexts } from '#imports'
import { KEYS } from '#nuxt-easy-texts/keys'

const { $texts, $textsPlural } = useEasyTexts()

const count = ref(0)
const name = ref('John')

const keys = ref(KEYS)

const text = computed(() => {
  if (count.value === 0) {
    return $texts('counterZero', 'No items.')
  }
  return $textsPlural('counterText', count.value, '1 item', '@count items')
})

const textWithQuotes = computed(() => {
  return $texts('textWithQuotes', 'There are "@count" items!').replace(
    '@count',
    count.value.toString(),
  )
})

const textWithBrackets = computed(() => {
  return $texts(
    'textWithBrackets',
    `There are "a lot of" (@count) items!`,
  ).replace('@count', count.value.toString())
})

const completelyWeirdText = computed(() => {
  return $textsPlural(
    'completelyWeirdText',
    count.value,
    `) hello ())) ))) ((( ( () )) ) ) (( ) ) ()( (((((((((((()) ) ) ) () () ) ) "  ()" (  (")")")"(" ()"( ")")")")")")"( ( (( "singular`,
    '(((((((((((((((((((((((((((((((()))()*")*)ç()"*ç)("*()ç"*()ç()*ç(")*(*"ç(*"(ç(çç((*ç"))"*ç("*)ç)"*(ç"*()ç("*ç)ç("*)çç (ç*"()"*(ç)"*ç( )"*ç(  (ç(*"))"*(ç"*)ç((ç )hello plural',
  )
})
</script>

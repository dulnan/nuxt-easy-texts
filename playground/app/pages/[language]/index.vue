<template>
  <div>
    <h1>{{ $texts('homepageTitle', 'Welcome to our homepage!') }}</h1>

    <section>
      <button @click="count--">
        {{ $texts('buttonDecrement', 'Remove 1') }}
      </button>
      <button @click="count++">
        {{ $texts('buttonIncrement', 'Add 1') }}
      </button>
      <h3>{{ text }}</h3>
      <p>{{ textWithQuotes }}</p>
      <p>{{ textWithBrackets }}</p>
      <p>{{ completelyWeirdText }}</p>
    </section>

    <section>
      <ul>
        <li v-for="key in keys" :key="key">{{ key }}</li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useEasyTexts } from '#imports'
import { KEYS } from '#nuxt-easy-texts/keys'

const { $texts, $textsPlural } = useEasyTexts()

const count = ref(0)

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

$texts('toggleDebugMode')

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

<template>
  <div style="margin-bottom: 400px">
    <hr />
    <label>
      <div>Name</div>
      <input v-model="name" />
    </label>
    <div>
      {{ singular }}
    </div>
    <hr />
    <div>
      <label>
        <div>Fruit</div>
        <select v-model="fruit">
          <option v-for="v in fruits" :key="v" :value="v">
            {{ v }}
          </option>
        </select>
      </label>
      <label>
        <div>Amount</div>
        <input type="number" v-model="count" />
      </label>

      <div>
        {{ plural }}
      </div>
    </div>
    <hr />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useEasyTexts } from '#imports'

const { $texts, $textsPlural } = useEasyTexts()

const name = ref('John')
const fruit = ref('apple')
const count = ref(0)

const fruits = ['apple', 'banana', 'lemon']

const singular = computed(() => {
  return $texts('replacementSingular', 'Hello @name', {
    '@name': name.value,
  })
})

const plural = computed<string>(() => {
  return $textsPlural(
    'replacementPlural',
    count.value,
    '1 @singular',
    '@count @plural',
    {
      '@singular': fruit.value,
      '@plural': fruit.value + 's',
    },
  )
})
</script>

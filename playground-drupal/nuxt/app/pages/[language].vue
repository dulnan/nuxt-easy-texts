<template>
  <div>
    <nav>
      <NuxtLink to="/en" data-testid="link-en">English</NuxtLink>
      |
      <NuxtLink to="/de" data-testid="link-de">Deutsch</NuxtLink>
    </nav>

    <h1 data-testid="home-title">{{ $texts('homeTitle', 'Welcome!') }}</h1>
    <p data-testid="greeting">
      {{ $texts('greeting', 'Hello @name!', { '@name': 'Drupal' }) }}
    </p>
    <p data-testid="edited-in-drupal">
      {{ $texts('editedInDrupal', 'Text from the code') }}
    </p>
    <p data-testid="not-in-drupal">
      {{ $texts('notInDrupal', 'Text only in the code') }}
    </p>
    <p data-testid="learn-more">{{ $texts('learnMore') }}</p>

    <button data-testid="add-to-cart" @click="count++">
      {{ $texts('cart.addButton', 'Add to cart') }}
    </button>
    <p data-testid="cart-items">
      {{ $textsPlural('cart.items', count, '1 item', '@count items') }}
    </p>
    <p data-testid="notifications">
      {{
        $textsPlural(
          'notifications',
          2,
          '1 notification',
          '@count notifications',
        )
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from '#imports'

const count = ref(1)
</script>

<template>
  <div
    class="nuxt-easy-texts-overlay-item"
    :style
    :data-easy-texts-index="index"
    :class="{
      'is-selected': selected,
    }"
  >
    <div v-if="selected">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path
          d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"
          fill="white"
        />
      </svg>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from '#imports'

const props = defineProps<{
  keys: string[]
  element: HTMLElement
  index: number
  selected: boolean
}>()

const rect = props.element.getBoundingClientRect()

const isVisible = ref(false)
const width = ref(rect.width)
const height = ref(rect.height)
const x = ref(rect.x)
const y = ref(rect.y)

const style = computed(() => {
  return {
    width: width.value + 'px',
    height: height.value + 'px',
    transform: `translate(${x.value}px, ${y.value}px)`,
  }
})

const observer = new IntersectionObserver((entries) => {
  const entry = entries[0]
  if (!entry) return
  isVisible.value = entry.isIntersecting
})

onMounted(() => {
  observer.observe(props.element)
})

onBeforeUnmount(() => {
  observer.disconnect()
})
</script>

<style>
.nuxt-easy-texts-overlay-item {
  pointer-events: auto;
  position: absolute;
  border: 2px dashed rgb(var(--highlight) / 90%);
  z-index: calc(var(--z-index) + 10);
  border-radius: 4px;
  cursor: pointer;
}

.nuxt-easy-texts-overlay-item:hover {
  border-color: rgb(var(--highlight) / 100%);
  border-style: solid;
  outline: 3px solid rgb(var(--highlight) / 20%);
}

.nuxt-easy-texts-overlay-item.is-selected {
  background-color: rgb(var(--highlight) / 20%);
  border-color: rgb(var(--highlight) / 100%);
  border-style: solid;
  outline: 3px solid rgb(var(--highlight) / 60%);
}

.nuxt-easy-texts-overlay-item > div {
  height: 100%;
  max-height: 20px;
  aspect-ratio: 1;
  position: absolute;
  top: 0;
  right: 0;
  background: rgb(var(--highlight));
  color: white;
  padding: 3px;
  z-index: calc(var(--z-index) + 20);
  border-radius: 0 0 0 4px;
  pointer-events: none;
  box-sizing: border-box;
}
</style>

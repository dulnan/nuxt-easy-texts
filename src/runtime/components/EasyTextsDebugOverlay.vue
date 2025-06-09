<template>
  <Teleport to="body">
    <div
      ref="overlayContainer"
      class="nuxt-easy-texts-overlay-container"
      @click="onClick"
    ></div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from '#imports'

type DebugMatch = {
  element: HTMLElement
  keys: string[]
  overlayEl?: HTMLDivElement
}

const xpath =
  "//*[contains(text(), '@{')" +
  " and contains(substring-after(text(), '@{'), '}')]"

function extractKeys(input: string): string[] {
  const regex = /@\{([^}]+)\}/g
  const matches: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(input)) !== null) {
    matches.push(match[1])
  }
  return matches
}

function onClick(event: MouseEvent) {
  if (!(event.target instanceof HTMLElement)) return
  const dataValue = event.target.dataset.textsKeys
  if (!dataValue) return
  const keys = dataValue.split(',')
  console.log(keys)
}

const matches: DebugMatch[] = []
const overlayContainer = ref<HTMLDivElement>()

let rafId: number

function createOverlays() {
  // for each new match, create an overlay div
  matches.forEach((m) => {
    if (!m.overlayEl) {
      const div = document.createElement('div')
      div.dataset.textsKeys = m.keys.join(',')
      overlayContainer.value!.appendChild(div)
      m.overlayEl = div
    }
  })
}

function updateOverlayPositions() {
  matches.forEach((m) => {
    const rect = m.element.getBoundingClientRect()
    if (m.overlayEl) {
      m.overlayEl.style.width = `${rect.width}px`
      m.overlayEl.style.height = `${rect.height}px`
      m.overlayEl.style.transform = `translate(${rect.left}px, ${rect.top}px)`
    }
  })
}

function loop() {
  updateOverlayPositions()
  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  // find all matching elements
  const iterator = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
    null,
  )

  try {
    let node = iterator.iterateNext()
    while (node) {
      if (node instanceof HTMLElement && node.textContent) {
        const keys = extractKeys(node.textContent)
        if (keys.length) {
          matches.push({ element: node, keys })
        }
      }
      node = iterator.iterateNext()
    }
  } catch (e) {
    console.error(`Error: Document tree modified during iteration ${e}`)
  }

  createOverlays()
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<style>
.nuxt-easy-texts-overlay-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.nuxt-easy-texts-overlay-container > div {
  pointer-events: auto;
  position: fixed;
  background-color: #2196f311;
  border: 1.5px solid #2196f3;
  z-index: 99999999999;
  border-radius: 4px;
  cursor: pointer;
}
.nuxt-easy-texts-overlay-container > div:hover {
  background-color: #2196f333;
}
</style>

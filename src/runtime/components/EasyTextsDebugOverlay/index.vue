<template>
  <Teleport to="body">
    <div
      :style="{
        '--highlight': color.join(' '),
        '--z-index': zIndex,
      }"
    >
      <div class="nuxt-easy-texts-overlay" @click="onClick">
        <div>
          <Match
            v-for="(match, index) in matches"
            :key="index"
            :keys="match.keys"
            :element="match.element"
            :index
            :selected="selectedIndices.includes(index)"
            :viewport-size
          />
        </div>
      </div>

      <form class="nuxt-easy-texts-selection" @submit.prevent="onSubmit">
        <div class="nuxt-easy-texts-selection-inner">
          <button
            type="button"
            :class="cancelButtonClass"
            @click.prevent="disableDebug"
          >
            {{ cancelButtonLabel }}
          </button>
          <button
            type="submit"
            :disabled="!selectedIndices.length"
            :class="editButtonClass"
          >
            {{ editButtonLabel }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  onMounted,
  ref,
  computed,
  useEasyTexts,
  onBeforeUnmount,
} from '#imports'
import {
  DEBUG_END,
  DEBUG_START,
  decodeInvisibleKeys,
} from '../../helpers/debug'
import Match from './Match.vue'

type DebugMatch = {
  element: HTMLElement
  keys: string[]
}

withDefaults(
  defineProps<{
    /**
     * The color to use for highlighting text keys.
     *
     * Expects an array of RGB values.
     */
    color?: [number, number, number]

    /**
     * The starting z index of the overlay.
     */
    zIndex?: number

    /**
     * The edit button label.
     *
     * Please don't use $texts for this one, because it needs to be clickable!
     */
    editButtonLabel?: string

    /**
     * The cancel button label.
     *
     * Please don't use $texts for this one, because it needs to be clickable!
     */
    cancelButtonLabel?: string

    /**
     * A class for the edit button.
     */
    editButtonClass?: string

    /**
     * Class for the cancel button.
     */
    cancelButtonClass?: string
  }>(),
  {
    color: () => {
      return [33, 150, 243]
    },
    zIndex: 2_140_000_000,
    editButtonLabel: 'Edit Texts',
    cancelButtonLabel: 'Cancel',
    editButtonClass: '',
    cancelButtonClass: '',
  },
)

const emit = defineEmits<{
  (e: 'edit', keys: string[]): void
}>()

const { disableDebug } = useEasyTexts()

const matches = ref<DebugMatch[]>([])
const selectedIndices = ref<number[]>([])

const viewportSize = ref({
  width: window.innerWidth,
  height: window.innerHeight,
})

const selected = computed(() => {
  return matches.value.filter((_, index) =>
    selectedIndices.value.includes(index),
  )
})

function onlyUnique(value: string, index: number, self: Array<string>) {
  return self.indexOf(value) === index
}

function onSubmit() {
  if (!selectedIndices.value.length) return

  const keys = selected.value
    .flatMap((v) => v.keys)
    .filter(onlyUnique)
    .sort()

  emit('edit', keys)
}

function findNodes(): DebugMatch[] {
  const matches: DebugMatch[] = []

  // Find DOM nodes containing the encoded characters as text content. Any of
  // an element's text nodes may hold a key: contains(text(), ...) would only
  // test the first one, so a key after e.g. a <b> would be missed.
  const textXpath = `//*[text()[contains(., '${DEBUG_START}') and contains(substring-after(., '${DEBUG_START}'), '${DEBUG_END}')]]`
  findNodesWithXPath(textXpath, matches, 'text')

  // Find DOM nodes containing attributes with the encoded characters.
  const attrXpath = `//*[@*[contains(., '${DEBUG_START}') and contains(substring-after(., '${DEBUG_START}'), '${DEBUG_END}')]]`
  findNodesWithXPath(attrXpath, matches, 'attributes')

  return matches
}

function handleNode(
  node: Node,
  matches: DebugMatch[],
  searchType: 'text' | 'attributes',
) {
  if (!(node instanceof HTMLElement)) {
    return
  }
  const keys: string[] =
    searchType === 'text'
      ? Array.from(node.childNodes)
          .filter((n): n is Text => n.nodeType === Node.TEXT_NODE)
          .flatMap((textNode) => decodeInvisibleKeys(textNode.nodeValue ?? ''))
      : extractKeysFromAttributes(node)

  if (keys.length) {
    // Check if this element is already in matches (could have both text and attribute keys).
    const existingMatch = matches.find((m) => m.element === node)
    if (existingMatch) {
      // Merge keys, avoiding duplicates.
      existingMatch.keys = [...new Set([...existingMatch.keys, ...keys])]
    } else {
      matches.push({
        element: node,
        keys,
      })
    }
  }
}

function findNodesWithXPath(
  xpath: string,
  matches: DebugMatch[],
  searchType: 'text' | 'attributes',
) {
  const iterator = document.evaluate(
    xpath,
    document.body,
    null,
    XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
    null,
  )

  try {
    let node: Node | null = iterator.iterateNext()
    while (node) {
      handleNode(node, matches, searchType)
      node = iterator.iterateNext()
    }
  } catch (e) {
    console.error(`Error: Document tree modified during iteration ${e}`)
  }
}

function extractKeysFromAttributes(element: HTMLElement): string[] {
  const keys: string[] = []

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i]
    if (attr?.value && attr.value.includes(DEBUG_START)) {
      const attrKeys = decodeInvisibleKeys(attr.value)
      keys.push(...attrKeys)
    }
  }

  return keys
}

function onClick(event: MouseEvent) {
  if (!(event.target instanceof HTMLElement)) return
  const dataValue = event.target.dataset.easyTextsIndex
  if (!dataValue) return
  const index = parseInt(dataValue)
  if (selectedIndices.value.includes(index)) {
    selectedIndices.value = selectedIndices.value.filter(
      (selectedIndex) => selectedIndex !== index,
    )
  } else {
    selectedIndices.value.push(index)
  }
}

let timeout: null | number = null

function onResize() {
  if (timeout) {
    window.clearTimeout(timeout)
  }
  timeout = window.setTimeout(() => {
    viewportSize.value = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }, 500)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  matches.value = findNodes()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (timeout) {
    window.clearTimeout(timeout)
  }
})
</script>

<style>
.nuxt-easy-texts-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: var(--z-index);
}

.nuxt-easy-texts-selection {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 1rem;
  background: white;
  z-index: calc(var(--z-index) + 100);
}
</style>

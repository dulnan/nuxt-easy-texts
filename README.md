# vuepal

Vue components and helpers for Drupal integration.

## AdminToolbar

Provides component and GraphQL query to display the Drupal administration menu.

![AdminToolbar](screenshots/admin-toolbar.png)

### Usage

```vue
<template>
  <admin-toolbar :links="links" />
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { AdminMenuLinkFragment } from '@bazinga/vuepal'

@Component({
  fetch(this: AdminToolbar) {
    return this.$graphql.query('adminMenu').then((data) => {
      this.links = data.menu.links
    })
  }
})

export default DefaultLayout extends Vue {
  links: AdminMenuLinkFragment[] = []
}
</script>
```

## AdminLauncher

A launcher component displaying menu links and optionally a nodes. Can be opened
with Ctrl+F.

![AdminLauncher](screenshots/admin-launcher.png)

### Usage

```vue
<template>
  <admin-launcher :links="links" :nodes="nodes" @open="open" />
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { AdminMenuLinkFragment } from '@bazinga/vuepal'

@Component({
  fetch(this: AdminToolbar) {
    return this.$graphql.query('adminMenu').then((data) => {
      this.links = data.menu.links
      this.nodes = data.menu.nodes
    })
  }
})

export default DefaultLayout extends Vue {
  links: AdminMenuLinkFragment[] = []
  nodes: any[] = []

  open(item: any) {
    this.$router.push(item.path)
  }
}
</script>
```

## DrupalForm

Provides an component to display a Drupal rendered page (e.g. admin pages) in an
iframe. It interacts with postMessage message from
[drupal/layout_builder_iframe_modal](https://www.drupal.org/project/layout_builder_iframe_modal).

![DrupalForm](screenshots/drupal-form.png)

### Usage

```vue
<template>
  <drupal-form
    :backend-url="backendUrl"
    :url="drupalUrl"
    @close="close"
    @reload="reload"
    @launcher="openLauncher"
  />
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default DefaultLayout extends Vue {
  drupalUrl = '/admin/content'

  reload() {
    this.$nuxt.refresh()
  }

  close() {
    this.drupalUrl = ''
  }

  openLauncher() {
    // This is emitted if the user presses Ctrl-F inside the iframe.  Provides
    // a way to display the AdminLauncher in that case.
  }
}
</script>
```

import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'

describe('useEasyTexts composable e2e', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixture', import.meta.url)),
    build: true,
    browser: true,
  })

  describe('debug mode', () => {
    it('starts with debug mode disabled', async () => {
      const html = await $fetch<string>('/debug')
      expect(html).toContain('Debug: disabled')
      expect(html).toContain('[EN] Debug test text')
    })

    it('enableDebug() enables debug mode and shows keys', async () => {
      const page = await createPage('/debug')

      // Initially disabled
      const initialState = await page
        .locator('[data-testid="debug-state"]')
        .textContent()
      expect(initialState).toContain('disabled')

      // Click enable button
      await page.locator('[data-testid="btn-enable"]').click()

      // Wait for state to update
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="debug-state"]')
        return el?.textContent?.includes('enabled')
      })

      // Check debug state changed
      const newState = await page
        .locator('[data-testid="debug-state"]')
        .textContent()
      expect(newState).toContain('enabled')

      // Check text shows key instead of translation
      const debugText = await page
        .locator('[data-testid="debug-text"]')
        .textContent()
      expect(debugText).toContain('debug.test')
      expect(debugText).not.toContain('[EN]')

      await page.close()
    })

    it('disableDebug() disables debug mode and shows translations', async () => {
      const page = await createPage('/debug')

      // Enable debug first
      await page.locator('[data-testid="btn-enable"]').click()
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="debug-state"]')
        return el?.textContent?.includes('enabled')
      })

      // Now disable
      await page.locator('[data-testid="btn-disable"]').click()
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="debug-state"]')
        return el?.textContent?.includes('disabled')
      })

      // Check debug state changed back
      const state = await page
        .locator('[data-testid="debug-state"]')
        .textContent()
      expect(state).toContain('disabled')

      // Check text shows translation again
      const debugText = await page
        .locator('[data-testid="debug-text"]')
        .textContent()
      expect(debugText).toContain('[EN] Debug test text')

      await page.close()
    })

    it('toggleDebug() toggles between states', async () => {
      const page = await createPage('/debug')

      // Initially disabled
      let state = await page
        .locator('[data-testid="debug-state"]')
        .textContent()
      expect(state).toContain('disabled')

      // Toggle to enabled
      await page.locator('[data-testid="btn-toggle"]').click()
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="debug-state"]')
        return el?.textContent?.includes('enabled')
      })

      state = await page.locator('[data-testid="debug-state"]').textContent()
      expect(state).toContain('enabled')

      // Toggle back to disabled
      await page.locator('[data-testid="btn-toggle"]').click()
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="debug-state"]')
        return el?.textContent?.includes('disabled')
      })

      state = await page.locator('[data-testid="debug-state"]').textContent()
      expect(state).toContain('disabled')

      await page.close()
    })

    it('debug mode affects $textsPlural as well', async () => {
      const page = await createPage('/debug')

      // Enable debug
      await page.locator('[data-testid="btn-enable"]').click()
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="debug-state"]')
        return el?.textContent?.includes('enabled')
      })

      // Check plural text shows key
      const pluralText = await page
        .locator('[data-testid="debug-plural"]')
        .textContent()
      expect(pluralText).toContain('plural.key')
      expect(pluralText).not.toContain('[LOADED]')

      await page.close()
    })
  })

  describe('language override', () => {
    it('renders default language text outside override', async () => {
      const html = await $fetch<string>('/language-override')
      expect(html).toContain('[EN] Override test text')
    })

    it('renders override language text inside EasyTextsLanguageOverride', async () => {
      const page = await createPage('/language-override')

      // Text inside override (using child component) should show German
      const overrideText = await page
        .locator('[data-testid="override-text"]')
        .textContent()
      expect(overrideText).toContain('[DE] Override Testtext')

      await page.close()
    })

    it('renders plural text in override language', async () => {
      const page = await createPage('/language-override')

      // Plural with count 3 in German
      const pluralText = await page
        .locator('[data-testid="override-plural"]')
        .textContent()
      expect(pluralText).toContain('[GELADEN] 3 Elemente')

      await page.close()
    })

    it('sets lang attribute on override wrapper when language differs', async () => {
      const page = await createPage('/language-override')

      // Check the override wrapper has lang="de"
      const wrapper = page.locator('[data-testid="override-wrapper"]')
      const lang = await wrapper.getAttribute('lang')
      expect(lang).toBe('de')

      await page.close()
    })

    it('supports custom tag prop on EasyTextsLanguageOverride', async () => {
      const page = await createPage('/language-override')

      // Check the section tag exists with the lang attribute
      const section = page.locator('section[data-testid="override-section"]')
      const isVisible = await section.isVisible()
      expect(isVisible).toBe(true)

      // Check it has lang attribute
      const lang = await section.getAttribute('lang')
      expect(lang).toBe('de')

      // Check it has German text
      const sectionText = await page
        .locator('[data-testid="section-text"]')
        .textContent()
      expect(sectionText).toContain('[DE] Debug Testtext')

      await page.close()
    })

    it('text after override uses default language again', async () => {
      const page = await createPage('/language-override')
      const afterText = await page
        .locator('[data-testid="after-override-text"]')
        .textContent()
      expect(afterText).toContain('[EN] Debug test text')

      await page.close()
    })
  })

  describe('plugin functionality', () => {
    it('$texts is available and returns loaded translations', async () => {
      const html = await $fetch<string>('/')
      expect(html).toContain('[LOADED] Basic text')
    })

    it('$textsPlural returns correct plural form', async () => {
      const html = await $fetch<string>('/')
      // Count is 2, should show plural
      expect(html).toContain('[LOADED] 2 items')
    })

    it('$textsPlural returns correct singular form', async () => {
      const html = await $fetch<string>('/')
      // Count is 1, should show singular
      expect(html).toContain('[LOADED] Alice has one item')
    })
  })
})

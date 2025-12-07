import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('vite plugin transform e2e', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixture', import.meta.url)),
    build: true,
  })

  it('renders basic $texts with loaded text', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('data-testid="basic"')
    expect(html).toContain('[LOADED] Basic text')
  })

  it('renders ALL duplicate $texts calls with loaded text', async () => {
    const html = await $fetch<string>('/')

    // All three duplicate calls should show loaded text, not default text
    // This is the regression test for the s.replace() bug
    // Note: may be >= 3 due to hydration payload
    const matches = html.match(/\[LOADED\] Duplicate text/g)
    expect(matches?.length).toBeGreaterThanOrEqual(3)

    // Should NOT contain the default text (would indicate transform failed)
    expect(html).not.toContain('>Duplicate text<')
  })

  it('renders $texts with percentage signs correctly', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('[LOADED] Enter 40% here')
  })

  it('renders $textsPlural with loaded text and count replacement', async () => {
    const html = await $fetch<string>('/')
    // count is 2, so should use plural form with @count replaced
    expect(html).toContain('[LOADED] 2 items')
  })

  it('renders ALL duplicate $textsPlural calls with loaded text', async () => {
    const html = await $fetch<string>('/')

    // Both duplicate plural calls should show loaded text
    // count is 3, so should use plural form with @count replaced
    const matches = html.match(/\[LOADED\] 3 things/g)
    expect(matches).toHaveLength(2)

    // Should NOT contain the default texts
    expect(html).not.toContain('>One thing<')
    expect(html).not.toContain('>@count things<')
  })

  // Tests for $texts with replacements argument

  it('renders $texts with single replacement', async () => {
    const html = await $fetch<string>('/')
    // userName is 'Alice', so @name should be replaced
    expect(html).toContain('[LOADED] Hello Alice!')
  })

  it('renders $texts with multiple replacements', async () => {
    const html = await $fetch<string>('/')
    // userName is 'Alice', placeName is 'Wonderland'
    expect(html).toContain('[LOADED] Welcome Alice to Wonderland!')
  })

  it('renders $texts with replacements containing special characters', async () => {
    const html = await $fetch<string>('/')
    // Replacements include $ and % characters
    expect(html).toContain('[LOADED] Price: $99.99 (20% off)')
  })

  // Tests for $textsPlural with replacements argument

  it('renders $textsPlural with replacements (singular form)', async () => {
    const html = await $fetch<string>('/')
    // count is 1, so should use singular form with @name replaced
    expect(html).toContain('[LOADED] Alice has one item')
  })

  it('renders $textsPlural with replacements (plural form)', async () => {
    const html = await $fetch<string>('/')
    // count is 5, so should use plural form with @name and @count replaced
    expect(html).toContain('[LOADED] Alice has 5 items')
  })

  it('renders $textsPlural with multiple replacements', async () => {
    const html = await $fetch<string>('/')
    // count is 3, @user is 'Alice', @price is '$150.00'
    expect(html).toContain('[LOADED] Alice: 3 products ($150.00)')
  })

  // Regression test: duplicate $texts with replacements

  it('renders ALL duplicate $texts calls with replacements', async () => {
    const html = await $fetch<string>('/')

    // Both duplicate calls with replacements should show loaded text
    const matches = html.match(/\[LOADED\] Hello Alice!/g)
    expect(matches?.length).toBeGreaterThanOrEqual(3) // 1 single + 2 duplicates

    // Should NOT contain the default text pattern
    expect(html).not.toContain('>Hello @name!<')
  })
})

import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'

const drupalUrl = process.env.NUXT_DRUPAL_URL

/**
 * Returns the text of every element with a data-testid in the HTML.
 */
function getTexts(html: string): Record<string, string> {
  const texts: Record<string, string> = {}
  for (const match of html.matchAll(/data-testid="([^"]+)"[^>]*>([^<]*)</g)) {
    texts[match[1]!] = match[2]!.trim()
  }
  return texts
}

/**
 * Tests the drupal-graphql-texts generator against a real Drupal site with
 * drupal/texts: playground-drupal/drupal, set up with "ddev setup".
 *
 * Only runs with NUXT_DRUPAL_URL set, e.g. with "npm run test:drupal".
 */
describe.runIf(drupalUrl)('drupal/texts integration', async () => {
  await setup({
    rootDir: fileURLToPath(
      new URL('../../playground-drupal/nuxt', import.meta.url),
    ),
    build: true,
    browser: true,
  })

  it('renders the texts from Drupal', async () => {
    const texts = getTexts(await $fetch<string>('/en'))

    expect(texts).toEqual({
      'link-en': 'English',
      'link-de': 'Deutsch',
      'home-title': 'Welcome!',
      greeting: 'Hello Drupal!',
      'edited-in-drupal': 'Text edited in Drupal',
      'not-in-drupal': 'Text only in the code',
      'learn-more': 'Learn more',
      'add-to-cart': 'Add to cart',
      'cart-summary': 'Your cart',
      'cart-items': '1 item',
      notifications: '2 notifications',
    })
  })

  it('renders the German translations from Drupal', async () => {
    const texts = getTexts(await $fetch<string>('/de'))

    expect(texts).toEqual({
      'link-en': 'English',
      'link-de': 'Deutsch',
      'home-title': 'Willkommen!',
      greeting: 'Hallo Drupal!',
      // No German translation in Drupal: the English text is used.
      'edited-in-drupal': 'Text edited in Drupal',
      'not-in-drupal': 'Text only in the code',
      'learn-more': 'Learn more',
      'add-to-cart': 'In den Warenkorb',
      'cart-summary': 'Ihr Warenkorb',
      'cart-items': '1 Artikel',
      notifications: '2 notifications',
    })
  })

  it('saves texts Drupal does not have yet with the default text from the code', async () => {
    await $fetch<string>('/en')

    // Drupal ignores the default text of a text it already has.
    const response = await fetch(`${drupalUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          textsLoader {
            notInDrupal: getText(key: "notInDrupal", default: "Other")
            learnMore: getText(key: "learnMore", default: "Other")
            notifications: getTextPlural(key: "notifications", singular: "Other", plural: "Other") {
              singular
              plural
            }
          }
        }`,
      }),
    }).then((v) => v.json())

    expect(response).toEqual({
      data: {
        textsLoader: {
          notInDrupal: 'Text only in the code',
          learnMore: 'Learn more',
          notifications: {
            singular: '1 notification',
            plural: '@count notifications',
          },
        },
      },
    })
  })

  it('loads the texts of the new language when the language changes', async () => {
    const page = await createPage('/en')
    await page.getByTestId('link-de').click()

    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="home-title"]')?.textContent ===
        'Willkommen!',
    )
    expect(await page.getByTestId('add-to-cart').textContent()).toContain(
      'In den Warenkorb',
    )

    await page.getByTestId('add-to-cart').click()
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="cart-items"]')
          ?.textContent?.trim() === '2 Artikel',
    )

    await page.close()
  })
})

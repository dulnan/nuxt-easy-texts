# Texts from Drupal

The texts of the app are managed in Drupal, with the
[texts](https://www.drupal.org/project/texts) module. The `drupal-graphql-texts`
generator writes a GraphQL fragment with every key and its default texts, to the
`outputPath` in `easyTexts.generators`. The loader queries
`textsLoader { ...easyTexts }` and turns the result into texts with
`mapDrupalTexts()`. The fragment is generated, so change the calls in the code,
not the fragment.

Editors manage the texts in Drupal at `/admin/config/regional/texts`.

## Add a text

Write the call with its default texts. Drupal creates the text from them on the
first request for the key, so the text appears in Drupal once the change is
deployed and a page loads its texts. Editors translate it there.

If the `require_edit_permission_for_create` setting of `texts` is on, only
requests of users with the `edit string translation` permission create texts.
Other requests get the default text, and the text doesn't appear in Drupal.

## Change a text

Drupal ignores the default text of a key it already has. Changing the default
text in the code changes the fallback, and the text on a Drupal site that
doesn't have the key yet, but not the text the site shows. Change it in Drupal,
or ask the editors to.

- To bring the texts from Drupal into the code, run `nuxt easy-texts merge` with
  a page of the site.
- A renamed key is a new text in Drupal, created from the default text. Its
  translations stay with the old key.
- To set texts in Drupal with a deploy, call the `texts.translations` service in
  a deploy or update hook. The second argument is the context, `default` if left
  out. A new key needs a text in the site's default language. The service can't
  set plural texts.

  ```php
  \Drupal::service('texts.translations')->add([
    'addButton' => ['de' => 'In den Warenkorb', 'en' => 'Add to cart'],
  ], 'cart');
  ```

## Keys

- The context of a key, the part before the first dot, is the context in Drupal:
  `cart.addButton` is the key `addButton` in the context `cart`. A key without a
  dot is in the `default` context.
- The generator names each GraphQL field after its key, with each dot replaced
  by `__`. So a key contains only ASCII letters, digits, underscores and dots,
  doesn't start with a digit, and has no `__` and no underscore right before a
  dot. The build fails at the call otherwise.

## Languages

- The fields have no language argument. Drupal answers in the language of the
  request, usually from a path prefix like `/de/graphql`, so the loader requests
  the language that `load()` receives.
- A text without a translation in the requested language is returned in its
  original language.

## When a text looks wrong

- **It shows the key.** The loaded texts don't have it: the call is in a file
  that `easyTexts.pattern` doesn't match, and the build warned about it, or
  Drupal returned no text for the key.
- **It shows the default text from the code.** Loading the texts failed, and the
  log has `[nuxt-easy-texts] Loading the texts for language "…" failed`. Or the
  text in Drupal is still the default text it was created from.
- **It shows another language.** Drupal has no translation in that language, or
  the loader requested another language.

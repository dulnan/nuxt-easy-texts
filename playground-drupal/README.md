# Drupal playground

A Nuxt app (`nuxt/`) that loads its texts from a Drupal site (`drupal/`) with
[drupal/texts](https://www.drupal.org/project/texts) and
[graphql_core_schema](https://www.drupal.org/project/graphql_core_schema). It
uses the fragment of the `drupal-graphql-texts` generator, like a real app
would.

## Setup

Requires [DDEV](https://ddev.com).

```sh
cd playground-drupal/drupal
ddev start
ddev setup
```

`ddev setup` installs Drupal from scratch, with a few English and German texts.
Run it again to reset all texts.

Then, from the repository root:

```sh
npm run dev:drupal    # Nuxt dev server
npm run test:drupal   # E2E test, test/e2e/drupal.test.ts
```

Drupal runs at https://nuxt-easy-texts.ddev.site. Log in with `admin` / `admin`.
The texts are at `/admin/config/regional/texts`.

## What is committed

Only the files needed to rebuild the site: the DDEV config, the `setup` command,
`composer.json`, `composer.lock` and the `easy_texts_playground` module. The
module creates the GraphQL server and the German language, and adds the texts.
Composer installs everything else.

`composer.lock` pins the Drupal versions the CI job tests against. To test newer
versions, run `ddev composer update` and commit the lock file.

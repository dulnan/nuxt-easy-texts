import { describe, it, expect } from 'vitest'
import { parse as parseJs } from 'acorn'
import ts from 'typescript'
import type { ModuleHelper } from '../../src/build/classes/ModuleHelper'
import type { Extraction } from '../../src/build/types/extraction'
import keysTemplate from '../../src/build/templates/definitions/keys'
import loaderTemplate from '../../src/build/templates/definitions/loader'
import globalTemplate from '../../src/build/templates/definitions/global'
import generatorDrupal from '../../src/build/templates/definitions/generatorDrupal'

// Keys and default texts come from string literals in the app's source code,
// so after unescaping they can contain any character. The templates embed
// them in generated JS, TS and GraphQL, where they must stay valid literals.
const TRICKY = [
  'double "quote"',
  "single 'quote'",
  'back\\slash',
  'ends with backslash\\',
  'line\nbreak',
  'tab\there',
  '${not.interpolated}',
  '</script>',
]

function text(fullKey: string, defaultText: string): Extraction {
  return { type: 'text', fullKey, key: fullKey, defaultText, filePath: 'a.vue' }
}

function plural(fullKey: string, singular: string, pluralText: string) {
  return {
    type: 'plural',
    fullKey,
    key: fullKey,
    singular,
    plural: pluralText,
    filePath: 'a.vue',
  } satisfies Extraction
}

// The templates only read these members of the helper.
const helper = {
  paths: { runtimeTypes: "../../o'brien/runtime/types" },
  toModuleBuildRelative: () => "../../o'brien/app/easyTexts.loader",
} as unknown as ModuleHelper

/**
 * Parse TypeScript and fail on any syntax error.
 */
function parseTs(code: string): ts.SourceFile {
  const { diagnostics } = ts.transpileModule(code, {
    fileName: 'template.ts',
    reportDiagnostics: true,
  })
  expect(
    (diagnostics ?? []).map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    ),
  ).toEqual([])
  return ts.createSourceFile('template.ts', code, ts.ScriptTarget.Latest, true)
}

/**
 * Collect all nodes of the given kind.
 */
function findAll<T extends ts.Node>(
  node: ts.Node,
  guard: (n: ts.Node) => n is T,
): T[] {
  const found: T[] = []
  const visit = (n: ts.Node) => {
    if (guard(n)) found.push(n)
    n.forEachChild(visit)
  }
  visit(node)
  return found
}

/**
 * Returns the members of the type alias with the given name, as a map of
 * property name to the property's type node.
 */
function typeAliasMembers(source: ts.SourceFile, name: string) {
  const alias = findAll(source, ts.isTypeAliasDeclaration).find(
    (a) => a.name.text === name,
  )
  expect(alias && ts.isTypeLiteralNode(alias.type)).toBe(true)
  const members = new Map<string, ts.TypeNode>()
  for (const member of (alias!.type as ts.TypeLiteralNode).members) {
    if (ts.isPropertySignature(member) && member.type) {
      members.set((member.name as ts.StringLiteral).text, member.type)
    }
  }
  return members
}

function literalText(node: ts.TypeNode): string {
  expect(ts.isLiteralTypeNode(node)).toBe(true)
  return ((node as ts.LiteralTypeNode).literal as ts.StringLiteral).text
}

describe('keys template', () => {
  const extractions: Extraction[] = TRICKY.flatMap((value, i) => [
    text(`single.${i}.${value}`, `Default ${value}`),
    plural(`plural.${i}.${value}`, `One ${value}`, `@count ${value}`),
  ])

  it('generates a KEYS array that holds every key unchanged', async () => {
    const code = await keysTemplate.build!(extractions, helper)
    const program = parseJs(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    })

    const declaration = program.body[0]
    expect(declaration?.type).toBe('ExportNamedDeclaration')
    const init = (declaration as any).declaration.declarations[0].init
    expect(init.elements.map((e: any) => e.value)).toEqual(
      extractions.map((e) => e.fullKey),
    )
  })

  it('generates types whose keys and default texts are unchanged', async () => {
    const code = await keysTemplate.buildTypes!(extractions, helper)
    const source = parseTs(code)

    const single = typeAliasMembers(source, 'EasyTextsSingle')
    const pluralMembers = typeAliasMembers(source, 'EasyTextsPlural')

    for (const extraction of extractions) {
      if (extraction.type === 'text') {
        expect(literalText(single.get(extraction.fullKey)!)).toBe(
          extraction.defaultText,
        )
      } else {
        const tuple = pluralMembers.get(extraction.fullKey)!
        expect(ts.isTupleTypeNode(tuple)).toBe(true)
        expect((tuple as ts.TupleTypeNode).elements.map(literalText)).toEqual([
          extraction.singular,
          extraction.plural,
        ])
      }
    }
  })
})

describe('drupal-graphql-texts generator', () => {
  /**
   * Returns the arguments of every generated field as decoded strings.
   *
   * The generator emits GraphQL string literals; the escape sequences that
   * JSON.parse understands are a subset of GraphQL's, so it can decode them.
   * A literal containing a raw line break is invalid GraphQL and does not
   * match, which makes its argument go missing.
   */
  function parseFields(code: string): Record<string, string>[] {
    const body = code.slice(code.indexOf('{') + 1, code.lastIndexOf('}'))
    return [
      ...body.matchAll(
        /getText(?:Plural)?\(((?:[^()"]|"(?:[^"\\\n]|\\.)*")*)\)/g,
      ),
    ].map((match) =>
      Object.fromEntries(
        [...match[1]!.matchAll(/(\w+): ("(?:[^"\\\n]|\\.)*")/g)].map(
          ([, name, literal]) => [name, JSON.parse(literal!)],
        ),
      ),
    )
  }

  it.each(TRICKY)('keeps the default text %j unchanged', async (value) => {
    const template = generatorDrupal('fragment.graphql')
    const code = await template.build!(
      [
        {
          ...text('ctx.key', `Default ${value}`),
          key: 'key',
          context: 'ctx',
        },
      ],
      helper,
    )

    expect(parseFields(code)).toEqual([
      { key: 'key', context: 'ctx', default: `Default ${value}` },
    ])
  })

  it.each(TRICKY)('keeps the plural texts %j unchanged', async (value) => {
    const template = generatorDrupal('fragment.graphql')
    const code = await template.build!(
      [plural('items', `One ${value}`, `@count ${value}`)],
      helper,
    )

    expect(parseFields(code)).toEqual([
      { key: 'items', singular: `One ${value}`, plural: `@count ${value}` },
    ])
  })
})

describe('import paths in generated templates', () => {
  // Paths are relative to the module build dir, so they only contain the
  // folders between it and the target, which can include a quote.
  it('loader template imports the loader by its exact path', () => {
    const program = parseJs(loaderTemplate.build!(helper), {
      ecmaVersion: 'latest',
      sourceType: 'module',
    })
    const imports = program.body.filter((n) => n.type === 'ImportDeclaration')
    expect(imports.map((n: any) => n.source.value)).toEqual([
      "../../o'brien/app/easyTexts.loader",
    ])
  })

  it.each([
    ['loader', loaderTemplate],
    ['global', globalTemplate],
  ])(
    '%s type template imports the runtime types by their exact path',
    (_, template) => {
      const source = parseTs(template.buildTypes!(helper))
      const specifiers = findAll(source, ts.isImportDeclaration).map(
        (n) => (n.moduleSpecifier as ts.StringLiteral).text,
      )
      expect(specifiers).toEqual(["../../o'brien/runtime/types"])
    },
  )
})

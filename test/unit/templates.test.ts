import { describe, it, expect } from 'vitest'
import { parse as parseJs } from 'acorn'
import ts from 'typescript'
import type { ModuleHelper } from '../../src/build/classes/ModuleHelper'
import type { Extraction } from '../../src/build/types/extraction'
import keysTemplate from '../../src/build/templates/definitions/keys'
import defaultsTemplate from '../../src/build/templates/definitions/defaults'
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

/**
 * Type check the given in-memory files and return the error messages.
 */
function typeErrors(files: Record<string, string>): string[] {
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    lib: ['lib.es2022.d.ts'],
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (name, language, ...rest) =>
    name in files
      ? ts.createSourceFile(name, files[name]!, language)
      : getSourceFile(name, language, ...rest)
  const program = ts.createProgram(Object.keys(files), options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

describe('keys template types', () => {
  async function check(code: string) {
    const declarations = await keysTemplate.buildTypes!(
      [
        text('single.key', 'Single'),
        plural('plural.key', 'One item', '@count items'),
      ],
      helper,
    )
    return typeErrors({
      '/keys.d.ts': declarations,
      '/use.ts': `import { KEYS, type EasyTextsKey } from '#nuxt-easy-texts/keys'
${code}
export {}`,
    })
  }

  it('accepts single and plural keys as EasyTextsKey', async () => {
    expect(
      await check(`const single: EasyTextsKey = 'single.key'
const pluralKey: EasyTextsKey = 'plural.key'
const all: EasyTextsKey[] = KEYS
const first: 'single.key' | 'plural.key' | undefined = KEYS[0]`),
    ).toEqual([])
  })

  it('rejects unknown keys as EasyTextsKey', async () => {
    expect(await check(`const key: EasyTextsKey = 'missing.key'`)).toEqual([
      expect.stringContaining(`'"missing.key"' is not assignable`),
    ])
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

  describe('key validation', () => {
    const validate = (extractions: Extraction[]) =>
      generatorDrupal('fragment.graphql').validate!(extractions)

    it('accepts keys that become valid GraphQL field names', () => {
      expect(
        validate(
          [
            'homeTitle',
            'cart.addButton',
            'a_b.c1',
            '_private',
            'cart._private',
            'x.y.z',
          ].map((key) => text(key, 'Text')),
        ),
      ).toEqual([])
    })

    it.each(['cart.add-button', 'with space', '404.title', 'größe', 'a.🎉'])(
      'rejects %j, whose field name is not a GraphQL name',
      (key) => {
        const extraction = {
          ...text(key, 'Text'),
          call: { code: `$texts('${key}', 'Text')`, start: 10, end: 30 },
        }

        expect(validate([extraction])).toEqual([
          {
            message: expect.stringContaining(`Key "${key}" can't be used`),
            filePath: 'a.vue',
            call: extraction.call,
          },
        ])
      },
    )

    it.each([
      ['foo__bar', 'foo.bar'],
      ['cart.foo__bar', 'cart.foo.bar'],
      ['a_.b', 'a._b'],
      ['__typename', '.typename'],
    ])(
      'rejects %j, which mapDrupalTexts() reads back as %j',
      (key, readBack) => {
        const extraction = {
          ...text(key, 'Text'),
          call: { code: `$texts('${key}', 'Text')`, start: 10, end: 30 },
        }

        expect(validate([extraction])).toEqual([
          {
            message: expect.stringContaining(
              `reads back as the key "${readBack}"`,
            ),
            filePath: 'a.vue',
            call: extraction.call,
          },
        ])
      },
    )

    it('only rejects the key that is not read back when two keys share a field name', () => {
      const errors = validate([text('a.b', 'One'), text('a__b', 'Two')])

      expect(errors).toHaveLength(1)
      expect(errors[0]!.message).toContain('Key "a__b" can\'t be used')
    })
  })

  it('sorts the fields independently of the system locale', async () => {
    // In e.g. Swedish, "ä" sorts after "z"; in English, next to "a".
    const template = generatorDrupal('fragment.graphql')
    const code = await template.build!(
      [text('z', 'Z'), text('ä', 'Ä'), text('a', 'A')],
      helper,
    )

    expect(parseFields(code).map((args) => args.key)).toEqual(['a', 'ä', 'z'])
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

describe('defaults template', () => {
  /**
   * Parses the generated module and returns its default export.
   */
  async function evaluate(extractions: Extraction[]) {
    const code = await defaultsTemplate.build!(extractions, helper)
    parseJs(code, { ecmaVersion: 'latest', sourceType: 'module' })
    return new Function(code.replace(/^export default /, 'return '))()
  }

  it('exports the default texts in the shape a loader returns', async () => {
    expect(
      await evaluate([
        text('homeTitle', 'Welcome'),
        text('cart.addButton', 'Add to cart'),
        plural('cart.items', '1 item', '@count items'),
        plural('cart.empty', '', ''),
      ]),
    ).toEqual({
      homeTitle: 'Welcome',
      'cart.addButton': 'Add to cart',
      'cart.items': ['1 item', '@count items'],
      'cart.empty': ['', ''],
    })
  })

  it('leaves out texts without a default text', async () => {
    expect(
      await evaluate([
        {
          type: 'text',
          fullKey: 'noDefault',
          key: 'noDefault',
          filePath: 'a.vue',
        },
        text('emptyDefault', ''),
      ]),
    ).toEqual({ emptyDefault: '' })
  })

  it('keeps keys and texts unchanged', async () => {
    const extractions: Extraction[] = TRICKY.flatMap((value, i) => [
      text(`single.${i}.${value}`, `Default ${value}`),
      plural(`plural.${i}.${value}`, `One ${value}`, `@count ${value}`),
    ])

    expect(await evaluate(extractions)).toEqual(
      Object.fromEntries(
        extractions.map((e) => [
          e.fullKey,
          e.type === 'text' ? e.defaultText : [e.singular, e.plural],
        ]),
      ),
    )
  })

  it('exports a "__proto__" key as a text', async () => {
    const texts = await evaluate([text('__proto__', 'Prototype')])

    expect(Object.getPrototypeOf(texts)).toBe(Object.prototype)
    expect(Object.keys(texts)).toEqual(['__proto__'])
    expect(texts['__proto__']).toBe('Prototype')
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

import { babelParse, parse } from 'vue/compiler-sfc'

/**
 * Whether the character of a text at the index must be written as a \x
 * escape, because it would end or change the syntax around the string
 * literal. JavaScript reads the escape as the same character.
 */
export type EscapeSequence = (text: string, index: number) => boolean

/**
 * A range of a file that runs as JavaScript.
 */
export type CodeRange = {
  start: number
  end: number

  /**
   * The $texts and $textsPlural calls in the range, by the position of the
   * method name, where the collector finds the call, with the positions of
   * their arguments.
   */
  calls: Calls

  /**
   * The characters to escape, beyond what JavaScript requires.
   */
  sequences: EscapeSequence[]
}

/**
 * An argument of a call, with its text if it is a string literal or a
 * template literal without placeholders.
 */
export type Argument = { start: number; end: number; text?: string }

/**
 * Calls by the position of the method name, with their arguments.
 */
export type Calls = Map<number, Argument[]>

type ParserPlugins = NonNullable<
  NonNullable<Parameters<typeof babelParse>[1]>['plugins']
>

type Location = { start: { offset: number }; end: { offset: number } }

type Expression = { loc: Location; content: string }

/**
 * The parts of a template node that are read here: the expression of a
 * directive, and the expression of an interpolation, whose content is an
 * object, unlike the string content of a text or comment.
 */
type TemplateNode = {
  props?: { exp?: Expression }[]
  content?: string | Expression
  children?: TemplateNode[]
}

const METHODS = ['$texts', '$textsPlural']

/**
 * The properties of a Babel node that contain no code.
 */
const NO_CODE_KEYS = new Set([
  'loc',
  'extra',
  'leadingComments',
  'trailingComments',
  'innerComments',
])

/**
 * HTML ends an attribute at its quote, whatever JavaScript escapes come
 * before it.
 */
const quote =
  (char: string): EscapeSequence =>
  (text, index) =>
    text[index] === char

/**
 * Vue ends an interpolation at the first }}, also inside a string.
 */
const INTERPOLATION_END: EscapeSequence = (text, index) =>
  text[index] === '}' && text[index - 1] === '}'

/**
 * A <script> block ends at the first </script, in any case.
 */
const SCRIPT_END: EscapeSequence = (text, index) =>
  text[index] === '/' &&
  text[index - 1] === '<' &&
  text.slice(index + 1, index + 7).toLowerCase() === 'script'

/**
 * Vue decodes character references like &#39; in template expressions before
 * it compiles them, also inside strings. Decoded, &#39; would end the string.
 * A character reference starts with & and a letter, digit or #.
 */
const CHARACTER_REFERENCE: EscapeSequence = (text, index) =>
  text[index] === '&' && /[\da-z#]/i.test(text[index + 1] ?? '')

/**
 * The Babel plugins for the language of a script, as Vite reads it.
 */
function getPlugins(lang: string): ParserPlugins {
  if (lang === 'tsx') {
    return ['typescript', 'jsx']
  }
  if (/^[cm]?ts$/.test(lang)) {
    return ['typescript']
  }
  return lang === 'jsx' ? ['jsx'] : []
}

/**
 * The node of the method name, if the callee is $texts or $textsPlural, also
 * as a property, as in this.$texts().
 */
function getMethodName(callee: unknown): { start: number } | undefined {
  const node = callee as {
    type?: string
    name?: string
    start?: number
    computed?: boolean
    property?: unknown
  }
  if (node.type === 'Identifier' && METHODS.includes(node.name!)) {
    return node as { start: number }
  }
  if (
    (node.type === 'MemberExpression' ||
      node.type === 'OptionalMemberExpression') &&
    !node.computed
  ) {
    return getMethodName(node.property)
  }
}

type BabelArgument = {
  type: string
  start: number
  end: number
  value?: unknown
  expressions?: unknown[]
  quasis?: { value: { cooked?: string | null } }[]
}

/**
 * The text of a string literal, or of a template literal without
 * placeholders.
 */
function getText(node: BabelArgument): string | undefined {
  if (node.type === 'StringLiteral' && typeof node.value === 'string') {
    return node.value
  }
  if (node.type === 'TemplateLiteral' && !node.expressions?.length) {
    return node.quasis?.[0]?.value.cooked ?? undefined
  }
}

/**
 * Adds the $texts and $textsPlural calls in a Babel AST.
 */
function collectCalls(node: unknown, offset: number, calls: Calls) {
  if (!node || typeof node !== 'object') {
    return
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectCalls(child, offset, calls))
    return
  }
  const { type, callee } = node as { type?: string; callee?: unknown }
  if (type === 'CallExpression' || type === 'OptionalCallExpression') {
    const name = getMethodName(callee)
    if (name) {
      const args = (node as { arguments: BabelArgument[] }).arguments
      calls.set(
        offset + name.start,
        args.map((arg) => ({
          start: offset + arg.start,
          end: offset + arg.end,
          text: getText(arg),
        })),
      )
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (!NO_CODE_KEYS.has(key)) {
      collectCalls(value, offset, calls)
    }
  }
}

/**
 * The $texts and $textsPlural calls in the code, which starts at the offset in
 * the file. Null if the code can't be parsed, so where its calls are is
 * unknown.
 */
function findCalls(
  code: string,
  offset: number,
  plugins: ParserPlugins,
): Calls | null {
  let ast
  try {
    ast = babelParse(code, { sourceType: 'module', plugins })
  } catch {
    return null
  }
  const calls: Calls = new Map()
  collectCalls(ast.program, offset, calls)
  return calls
}

/**
 * The calls in a template expression. Like Vue, this reads it as an
 * expression, as statements (an event handler) or as function parameters
 * (a slot).
 */
function findExpressionCalls(expression: string, offset: number): Calls {
  for (const [before, after] of [
    ['(', ')'],
    [' ', ' '],
    ['(', ')=>{}'],
  ] as const) {
    const calls = findCalls(
      before + expression + after,
      offset - before.length,
      ['typescript'],
    )
    if (calls) {
      return calls
    }
  }
  return new Map()
}

/**
 * Returns the ranges of a file that run as JavaScript, with the calls in
 * them. A call outside of these, e.g. in a comment, a string or the text of a
 * template, is not code, so it is left alone.
 *
 * In a .vue file, these are the script blocks and the expressions of a
 * template: the values of directives and the interpolations. The template of
 * another language than HTML, e.g. Pug, can't be read, so it has none.
 */
export function getCodeRanges(filePath: string, code: string): CodeRange[] {
  if (!filePath.endsWith('.vue')) {
    const calls = findCalls(
      code,
      0,
      getPlugins(filePath.split('.').pop()!.toLowerCase()),
    )
    return calls ? [{ start: 0, end: code.length, calls, sequences: [] }] : []
  }

  const { descriptor } = parse(code)
  const ranges: CodeRange[] = []

  for (const script of [descriptor.script, descriptor.scriptSetup]) {
    if (!script) {
      continue
    }
    const { start, end } = script.loc
    const calls = findCalls(
      script.content,
      start.offset,
      getPlugins(script.lang ?? 'js'),
    )
    if (calls) {
      ranges.push({
        start: start.offset,
        end: end.offset,
        calls,
        sequences: [SCRIPT_END],
      })
    }
  }

  const template = descriptor.template
  if (!template?.ast || (template.lang && template.lang !== 'html')) {
    return ranges
  }

  const addExpression = (
    expression: Expression,
    sequences: EscapeSequence[],
  ) => {
    const { start, end } = expression.loc
    const raw = code.slice(start.offset, end.offset)
    // Vue compiles the decoded expression. If the code contains character
    // references, its positions differ from the file's.
    if (raw === expression.content) {
      ranges.push({
        start: start.offset,
        end: end.offset,
        calls: findExpressionCalls(raw, start.offset),
        sequences: [...sequences, CHARACTER_REFERENCE],
      })
    }
  }

  const walk = (node: TemplateNode) => {
    for (const prop of node.props ?? []) {
      // A directive. The expression's location excludes the quotes. An
      // unquoted value can't contain a string.
      const char = prop.exp && code[prop.exp.loc.start.offset - 1]
      if (prop.exp && (char === '"' || char === "'")) {
        addExpression(prop.exp, [quote(char)])
      }
    }
    if (typeof node.content === 'object') {
      addExpression(node.content, [INTERPOLATION_END])
    }
    node.children?.forEach(walk)
  }

  // The AST covers the whole file, with offsets into it.
  walk(template.ast as unknown as TemplateNode)
  return ranges
}

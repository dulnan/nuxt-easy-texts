import { parse } from 'vue/compiler-sfc'

/**
 * A sequence that ends the surrounding HTML or Vue syntax. Its character at
 * `index` is written as a \x escape, which JavaScript reads as the same
 * character. `match` is lowercase and matched case-insensitively.
 */
export type EscapeSequence = {
  match: string
  index: number
}

/**
 * A range of a file in which the given sequences must be escaped.
 */
export type EscapeRange = {
  start: number
  end: number
  sequences: EscapeSequence[]
}

type Location = { start: { offset: number }; end: { offset: number } }

/**
 * The parts of a template node that are read here: the expression of a
 * directive, the value of an attribute, and the expression of an
 * interpolation, whose content is an object, unlike the string content of a
 * text or comment.
 */
type TemplateNode = {
  props?: { exp?: { loc: Location }; value?: { loc: Location } }[]
  content?: string | { loc: Location }
  children?: TemplateNode[]
}

/**
 * HTML ends an attribute at its quote, whatever JavaScript escapes come
 * before it.
 */
const quote = (char: string): EscapeSequence => ({ match: char, index: 0 })

/**
 * Vue ends an interpolation at the first }}, also inside a string.
 */
const INTERPOLATION_END: EscapeSequence = { match: '}}', index: 1 }

/**
 * A <script> block ends at the first </script, in any case.
 */
const SCRIPT_END: EscapeSequence = { match: '</script', index: 1 }

/**
 * Returns the ranges of a .vue file in which a text needs more escaping than
 * JavaScript requires: attribute values, interpolations and script blocks.
 */
export function getEscapeRanges(filePath: string, code: string): EscapeRange[] {
  if (!filePath.endsWith('.vue')) {
    return []
  }

  const { descriptor } = parse(code)
  const ranges: EscapeRange[] = []

  for (const script of [descriptor.script, descriptor.scriptSetup]) {
    if (script) {
      ranges.push({
        start: script.loc.start.offset,
        end: script.loc.end.offset,
        sequences: [SCRIPT_END],
      })
    }
  }

  const template = descriptor.template
  if (!template) {
    return ranges
  }

  // Template languages like Pug can't be read here, so everything is escaped
  // anywhere in the template.
  if (template.lang && template.lang !== 'html') {
    ranges.push({
      start: template.loc.start.offset,
      end: template.loc.end.offset,
      sequences: [quote('"'), quote("'"), INTERPOLATION_END],
    })
    return ranges
  }

  const addAttribute = (start: number, end: number, char?: string) => {
    if (char === '"' || char === "'") {
      ranges.push({ start, end, sequences: [quote(char)] })
    }
  }
  const walk = (node: TemplateNode) => {
    for (const prop of node.props ?? []) {
      if (prop.exp) {
        // A directive. The expression's location excludes the quotes.
        const { start, end } = prop.exp.loc
        addAttribute(start.offset, end.offset, code[start.offset - 1])
      } else if (prop.value) {
        // An attribute. The value's location includes the quotes.
        const { start, end } = prop.value.loc
        addAttribute(start.offset + 1, end.offset - 1, code[start.offset])
      }
    }
    if (typeof node.content === 'object') {
      ranges.push({
        start: node.content.loc.start.offset,
        end: node.content.loc.end.offset,
        sequences: [INTERPOLATION_END],
      })
    }
    node.children?.forEach(walk)
  }

  // The AST covers the whole file, with offsets into it. A template with a
  // src attribute has none.
  if (template.ast) {
    walk(template.ast as unknown as TemplateNode)
  }
  return ranges
}

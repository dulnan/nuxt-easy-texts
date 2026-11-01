import { parse } from 'vue/compiler-sfc'

/**
 * A range of a .vue file in which HTML ends at the given quote characters.
 */
export type QuoteRange = {
  start: number
  end: number
  quotes: string
}

type Location = { start: { offset: number }; end: { offset: number } }

/**
 * The parts of a template node that are read here: the expression of a
 * directive, or the value of an attribute.
 */
type TemplateNode = {
  props?: { exp?: { loc: Location }; value?: { loc: Location } }[]
  children?: TemplateNode[]
}

/**
 * Returns the attribute values of a .vue file's template, with the quote that
 * ends each of them.
 *
 * A call to $texts in :title="$texts('key', 'Text')" ends with the attribute
 * at the first ", so a " in the text must be escaped differently there. In
 * {{ }} and in <script>, every quote is fine.
 */
export function getVueQuoteRanges(code: string): QuoteRange[] {
  const { descriptor } = parse(code)
  const template = descriptor.template
  if (!template) {
    return []
  }

  // Template languages like Pug can't be read here, so both quotes are
  // escaped anywhere in the template.
  if (template.lang && template.lang !== 'html') {
    return [
      {
        start: template.loc.start.offset,
        end: template.loc.end.offset,
        quotes: `"'`,
      },
    ]
  }

  const ranges: QuoteRange[] = []
  const addRange = (start: number, end: number, quote: string | undefined) => {
    if (quote === '"' || quote === "'") {
      ranges.push({ start, end, quotes: quote })
    }
  }
  const walk = (node: TemplateNode) => {
    for (const prop of node.props ?? []) {
      if (prop.exp) {
        // A directive. The expression's location excludes the quotes.
        const { start, end } = prop.exp.loc
        addRange(start.offset, end.offset, code[start.offset - 1])
      } else if (prop.value) {
        // An attribute. The value's location includes the quotes.
        const { start, end } = prop.value.loc
        addRange(start.offset + 1, end.offset - 1, code[start.offset])
      }
    }
    node.children?.forEach(walk)
  }
  // The AST covers the whole file, with offsets into it.
  walk(template.ast as unknown as TemplateNode)
  return ranges
}

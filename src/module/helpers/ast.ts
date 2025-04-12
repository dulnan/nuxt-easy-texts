import type { BaseCallExpression, Program } from 'estree'

export function getExpression(
  program: Program,
): BaseCallExpression | undefined {
  const first = program.body[0]
  if (first && 'expression' in first) {
    return first.expression as BaseCallExpression
  }
}

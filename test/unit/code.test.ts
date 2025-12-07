import { describe, it, expect } from 'vitest'
import { extractMethodCalls } from '../../src/build/helpers/code'

describe('extractMethodCalls', () => {
  describe('basic extraction', () => {
    it('extracts a simple method call', () => {
      const code = `const text = $texts('hello.world', 'Hello World')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts('hello.world', 'Hello World')`)
      expect(calls[0]!.start).toBe(13)
      expect(calls[0]!.end).toBe(49)
    })

    it('extracts multiple method calls', () => {
      const code = `
        const a = $texts('key.one', 'One')
        const b = $texts('key.two', 'Two')
        const c = $texts('key.three', 'Three')
      `
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(3)
      expect(calls[0]!.code).toBe(`$texts('key.one', 'One')`)
      expect(calls[1]!.code).toBe(`$texts('key.two', 'Two')`)
      expect(calls[2]!.code).toBe(`$texts('key.three', 'Three')`)
    })

    it('returns empty array when no calls found', () => {
      const code = `const text = 'Hello World'`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(0)
    })

    it('extracts $textsPlural calls', () => {
      const code = `const text = $textsPlural('items', 5, 'One item', '@count items')`
      const calls = extractMethodCalls(code, '$textsPlural(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(
        `$textsPlural('items', 5, 'One item', '@count items')`,
      )
    })
  })

  describe('string handling', () => {
    it('handles single quotes in strings', () => {
      const code = `$texts('key', "It's a test")`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts('key', "It's a test")`)
    })

    it('handles double quotes in strings', () => {
      const code = `$texts('key', 'Say "hello"')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts('key', 'Say "hello"')`)
    })

    it('handles template literals', () => {
      const code = '$texts(`key.${dynamic}`, `Hello ${name}`)'
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe('$texts(`key.${dynamic}`, `Hello ${name}`)')
    })

    it('handles nested parentheses in template literals', () => {
      const code = '$texts(`key`, `Value: ${getValue()}`)'
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe('$texts(`key`, `Value: ${getValue()}`)')
    })
  })

  describe('nested structures', () => {
    it('handles nested function calls', () => {
      const code = `$texts('key', formatText(getValue()))`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts('key', formatText(getValue()))`)
    })

    it('handles deeply nested parentheses', () => {
      const code = `$texts('key', outer(middle(inner())))`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts('key', outer(middle(inner())))`)
    })

    it('handles object arguments', () => {
      const code = `$texts('key', 'Hello @name', { '@name': user.name })`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(
        `$texts('key', 'Hello @name', { '@name': user.name })`,
      )
    })

    it('handles array arguments', () => {
      const code = `$texts('key', ['one', 'two'])`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts('key', ['one', 'two'])`)
    })
  })

  describe('edge cases', () => {
    it('handles empty arguments', () => {
      const code = `$texts()`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts()`)
    })

    it('handles whitespace in calls', () => {
      const code = `$texts(   'key'   ,   'value'   )`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(`$texts(   'key'   ,   'value'   )`)
    })

    it('handles multiline calls', () => {
      const code = `$texts(
        'key',
        'value'
      )`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toContain('key')
      expect(calls[0]!.code).toContain('value')
    })

    it('throws error for unmatched parentheses', () => {
      const code = `$texts('key', 'value'`

      expect(() => extractMethodCalls(code, '$texts(')).toThrow(
        'Unmatched parentheses in the code.',
      )
    })

    it('handles consecutive calls without spaces', () => {
      const code = `$texts('a','A')$texts('b','B')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(2)
      expect(calls[0]!.code).toBe(`$texts('a','A')`)
      expect(calls[1]!.code).toBe(`$texts('b','B')`)
    })
  })

  describe('position tracking', () => {
    it('correctly tracks start and end positions', () => {
      const prefix = 'const x = '
      const call = `$texts('key', 'value')`
      const code = prefix + call

      const calls = extractMethodCalls(code, '$texts(')

      expect(calls[0]!.start).toBe(prefix.length)
      expect(calls[0]!.end).toBe(prefix.length + call.length)
    })

    it('correctly tracks positions for multiple calls', () => {
      const code = `$texts('a')   $texts('b')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls[0]!.start).toBe(0)
      expect(calls[0]!.end).toBe(11)
      expect(calls[1]!.start).toBe(14)
      expect(calls[1]!.end).toBe(25)
    })
  })
})

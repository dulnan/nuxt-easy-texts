import { describe, it, expect } from 'vitest'
import {
  extractMethodCalls,
  SOURCE_FILE_REGEX,
} from '../../src/build/helpers/code'

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

  describe('escaped characters', () => {
    // A backslash escapes the next character inside a string. Without handling
    // it, an escaped quote flips the scanner's quote state and everything that
    // follows is misread - the scan runs past the closing paren and throws.

    it('handles an escaped single quote inside a single-quoted string', () => {
      const code = String.raw`$texts('key', 'It\'s here')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(String.raw`$texts('key', 'It\'s here')`)
    })

    it('handles an escaped double quote inside a double-quoted string', () => {
      const code = String.raw`$texts('key', "She said \"hi\" once")`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(
        String.raw`$texts('key', "She said \"hi\" once")`,
      )
    })

    it('handles an odd number of escaped quotes', () => {
      // An even number of escapes can pass by accident: the state flips twice
      // and lands back where it started. An odd number cannot.
      const code = String.raw`$texts('key', 'It\'s Bob\'s and Ann\'s')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(
        String.raw`$texts('key', 'It\'s Bob\'s and Ann\'s')`,
      )
    })

    it('handles an escaped backtick inside a template literal', () => {
      const code = '$texts(`key`, `a \\` tick`)'
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe('$texts(`key`, `a \\` tick`)')
    })

    it('handles an escaped backslash at the end of a string', () => {
      const code = String.raw`$texts('key', 'path\\')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(String.raw`$texts('key', 'path\\')`)
    })

    it('still finds later calls after an escaped quote', () => {
      // The broken scanner consumed the rest of the file from the first
      // escaped quote onwards, so following calls went missing.
      const code = String.raw`$texts('a', 'It\'s') + $texts('b', 'Second')`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(2)
      expect(calls[0]!.code).toBe(String.raw`$texts('a', 'It\'s')`)
      expect(calls[1]!.code).toBe(`$texts('b', 'Second')`)
    })

    it('ignores an escaped quote inside a replacements value', () => {
      const code = String.raw`$texts('key', 'Hi @name', { '@name': 'O\'Brien' })`
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe(
        String.raw`$texts('key', 'Hi @name', { '@name': 'O\'Brien' })`,
      )
    })
  })

  describe('template literal interpolation', () => {
    // Interpolations hold code, not text, and nest arbitrarily.

    it('does not end the call on a literal }} inside a template', () => {
      // The old scanner treated any "}}" inside a template literal as the end
      // of an interpolation and stopped counting one bracket too early,
      // truncating the extracted call.
      const code = '$texts(`key`, `x ${a}} y`)'
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe('$texts(`key`, `x ${a}} y`)')
    })

    it('handles a template literal nested inside an interpolation', () => {
      const code = '$texts(`key`, `a ${`b ${c}`} d`)'
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe('$texts(`key`, `a ${`b ${c}`} d`)')
    })

    it('handles an object literal inside an interpolation', () => {
      const code = '$texts(`key`, `a ${fn({ x: 1 })} b`)'
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe('$texts(`key`, `a ${fn({ x: 1 })} b`)')
    })

    it('handles a quoted string inside an interpolation', () => {
      const code = "$texts(`key`, `a ${obj['k)y']} b`)"
      const calls = extractMethodCalls(code, '$texts(')

      expect(calls).toHaveLength(1)
      expect(calls[0]!.code).toBe("$texts(`key`, `a ${obj['k)y']} b`)")
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

    it('passes an unmatched call to onUnmatched and continues after it', () => {
      const code = `// Use $texts( for all texts.
const a = $texts('a', 'A')`
      const unmatched: number[] = []

      const calls = extractMethodCalls(code, '$texts(', (start) =>
        unmatched.push(start),
      )

      expect(unmatched).toEqual([7])
      expect(calls.map((c) => c.code)).toEqual([`$texts('a', 'A')`])
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

describe('SOURCE_FILE_REGEX', () => {
  // The vite plugin only strips default texts from matching files, so every
  // file type that `pattern` can collect must match.
  it.each([
    'a.vue',
    'a.js',
    'a.mjs',
    'a.cjs',
    'a.jsx',
    'a.ts',
    'a.mts',
    'a.cts',
    'a.tsx',
  ])('matches %s', (file) => {
    expect(SOURCE_FILE_REGEX.test(`/app/${file}`)).toBe(true)
  })

  it.each(['a.css', 'a.json', 'a.html', 'a.vue.map'])(
    'does not match %s',
    (file) => {
      expect(SOURCE_FILE_REGEX.test(`/app/${file}`)).toBe(false)
    },
  )
})

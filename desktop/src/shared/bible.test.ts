import { describe, expect, it } from 'vitest'
import { formatReference, lookupPassage, parseReference, resolveBook } from './bible'

describe('resolveBook', () => {
  it('resolves full names, abbreviations and numbered books', () => {
    expect(resolveBook('Romans')).toBe('Romans')
    expect(resolveBook('rom')).toBe('Romans')
    expect(resolveBook('Rom.')).toBe('Romans')
    expect(resolveBook('1 cor')).toBe('1 Corinthians')
    expect(resolveBook('1cor')).toBe('1 Corinthians')
    expect(resolveBook('2 Timothy')).toBe('2 Timothy')
    expect(resolveBook('ps')).toBe('Psalms')
    expect(resolveBook('Psalm')).toBe('Psalms')
    expect(resolveBook('Song of Songs')).toBe('Song of Solomon')
    expect(resolveBook('jn')).toBe('John')
    expect(resolveBook('1 jn')).toBe('1 John')
  })

  it('returns null for unknown books', () => {
    expect(resolveBook('Hezekiah')).toBeNull()
    expect(resolveBook('')).toBeNull()
  })
})

describe('parseReference', () => {
  it('parses a single verse', () => {
    expect(parseReference('John 3:16')).toEqual({ book: 'John', chapter: 3, verseStart: 16 })
  })

  it('parses a range with hyphen or en dash', () => {
    expect(parseReference('Romans 8:35-39')).toEqual({
      book: 'Romans',
      chapter: 8,
      verseStart: 35,
      verseEnd: 39
    })
    expect(parseReference('rom 8:35–39')).toEqual({
      book: 'Romans',
      chapter: 8,
      verseStart: 35,
      verseEnd: 39
    })
  })

  it('parses a whole chapter', () => {
    expect(parseReference('Psalm 23')).toEqual({ book: 'Psalms', chapter: 23 })
  })

  it('parses numbered books and tight spacing', () => {
    expect(parseReference('1 John 4:8')).toEqual({ book: '1 John', chapter: 4, verseStart: 8 })
    expect(parseReference('john3:16')).toEqual({ book: 'John', chapter: 3, verseStart: 16 })
  })

  it('puts a reversed range in order and collapses a one-verse range', () => {
    expect(parseReference('Romans 8:39-35')).toEqual({
      book: 'Romans',
      chapter: 8,
      verseStart: 35,
      verseEnd: 39
    })
    expect(parseReference('John 3:16-16')).toEqual({ book: 'John', chapter: 3, verseStart: 16 })
  })

  it('rejects input that is not a reference', () => {
    expect(parseReference('')).toBeNull()
    expect(parseReference('hello world')).toBeNull()
    expect(parseReference('Hezekiah 3:1')).toBeNull()
    expect(parseReference('John 0:1')).toBeNull()
  })
})

describe('formatReference', () => {
  it('formats chapters, verses and ranges', () => {
    expect(formatReference({ book: 'Psalms', chapter: 23 })).toBe('Psalms 23')
    expect(formatReference({ book: 'John', chapter: 3, verseStart: 16 })).toBe('John 3:16')
    expect(formatReference({ book: 'Romans', chapter: 8, verseStart: 35, verseEnd: 39 })).toBe(
      'Romans 8:35–39'
    )
  })
})

describe('lookupPassage', () => {
  it('returns every verse in a range', () => {
    const result = lookupPassage({ book: 'Romans', chapter: 8, verseStart: 35, verseEnd: 39 })
    expect(result?.reference).toBe('Romans 8:35–39')
    expect(result?.verses.map((v) => v.verse)).toEqual([35, 36, 37, 38, 39])
    expect(result?.verses[0].text).toMatch(/^Who shall separate us/)
  })

  it('returns a whole chapter when no verse is given', () => {
    const result = lookupPassage({ book: 'Psalms', chapter: 23 })
    expect(result?.reference).toBe('Psalms 23')
    expect(result?.verses).toHaveLength(6)
  })

  it('returns a single verse', () => {
    const result = lookupPassage({ book: 'John', chapter: 3, verseStart: 16 })
    expect(result?.reference).toBe('John 3:16')
    expect(result?.verses).toHaveLength(1)
  })

  it('trims a range to the verses that exist', () => {
    const result = lookupPassage({ book: 'John', chapter: 3, verseStart: 16, verseEnd: 40 })
    expect(result?.reference).toBe('John 3:16–17')
  })

  it('returns null when the passage is not in the starter text', () => {
    expect(lookupPassage({ book: 'Genesis', chapter: 1, verseStart: 1 })).toBeNull()
    expect(lookupPassage({ book: 'John', chapter: 3, verseStart: 99 })).toBeNull()
  })
})

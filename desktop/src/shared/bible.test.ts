import { describe, expect, it } from 'vitest'
import { formatReference, lookupPassage, parseReference, resolveBook } from './bible'
import kjv from './data/kjv.json'

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
    expect(result?.reference).toBe('John 3:16–36')
    expect(result?.verses).toHaveLength(21)
  })

  it('returns null for passages that do not exist', () => {
    expect(lookupPassage({ book: 'John', chapter: 3, verseStart: 99 })).toBeNull()
    expect(lookupPassage({ book: 'Genesis', chapter: 99 })).toBeNull()
    expect(lookupPassage({ book: 'Genesis', chapter: 0 })).toBeNull()
    expect(lookupPassage({ book: 'Genesis', chapter: 1, verseStart: 5, verseEnd: 2 })).toBeNull()
  })

  it('returns null for a version that is not installed', () => {
    expect(lookupPassage({ book: 'John', chapter: 3, verseStart: 16 }, 'NIV')).toBeNull()
  })
})

describe('King James Version data', () => {
  it('contains the whole Bible: 66 books, 1,189 chapters, 31,102 verses', () => {
    const books = installedBooks()
    expect(books).toHaveLength(66)
    expect(books.reduce((n, b) => n + b.length, 0)).toBe(1189)
    expect(books.reduce((n, b) => n + b.reduce((m, c) => m + c.length, 0), 0)).toBe(31102)
  })

  it('has no empty verses', () => {
    expect(installedBooks().every((b) => b.every((c) => c.every((v) => v.trim() !== '')))).toBe(true)
  })

  it('has no translator margin notes or stray spacing mixed into the verses', () => {
    const flagged = Object.entries(kjv.books).flatMap(([book, chapters]) =>
      chapters.flatMap((verses, c) =>
        verses.flatMap((text, v) => (/…|Heb\.|::| [,.;:!?]|\s{2}|^\s|\s$/.test(text) ? [`${book} ${c + 1}:${v + 1}`] : []))
      )
    )
    expect(flagged).toEqual([])
  })

  it('has the margin-note verses repaired', () => {
    expect(lookupPassage({ book: 'Exodus', chapter: 6, verseStart: 2 })?.verses[0].text).toBe(
      'And God spake unto Moses, and said unto him, I am the LORD:'
    )
    expect(lookupPassage({ book: 'Jonah', chapter: 1, verseStart: 16 })?.verses[0].text).toMatch(/and made vows\.$/)
  })

  it('has the right text at well-known places', () => {
    expect(lookupPassage({ book: 'Genesis', chapter: 1, verseStart: 1 })?.verses[0].text).toBe(
      'In the beginning God created the heaven and the earth.'
    )
    expect(lookupPassage({ book: 'John', chapter: 3, verseStart: 16 })?.verses[0].text).toMatch(/^For God so loved the world/)
    expect(lookupPassage({ book: 'Psalms', chapter: 119 })?.verses).toHaveLength(176)
    expect(lookupPassage({ book: 'Revelation', chapter: 22, verseStart: 21 })?.verses[0].text).toMatch(/grace of our Lord Jesus Christ/)
    expect(lookupPassage({ book: '3 John', chapter: 1 })?.verses).toHaveLength(14)
  })

  it('every book name the parser knows is in the Bible', () => {
    for (const name of ['1 Samuel', 'Song of Solomon', '2 Thessalonians', 'Jude']) {
      const ref = parseReference(`${name} 1`)
      expect(ref && lookupPassage(ref)).not.toBeNull()
    }
  })
})

function installedBooks(): string[][][] {
  return Object.values(kjv.books)
}

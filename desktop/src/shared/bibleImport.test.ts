import { describe, expect, it } from 'vitest'
import {
  BOOK_NAMES,
  installedVersions,
  lookupPassage,
  parseReference,
  registerBible,
  searchVerses,
  unregisterBible
} from './bible'
import { buildBibleText, parseBibleFile } from './bibleImport'
import { itemFromScripture } from './schedule'
import { isBibleText } from './validate'

// Invented text only, so no real translation is stored in the tests.
function rows(names: readonly string[] = BOOK_NAMES): Array<[string, number, number, string]> {
  const out: Array<[string, number, number, string]> = []
  names.forEach((book, bi) => {
    for (let c = 1; c <= 2; c++) for (let v = 1; v <= 3; v++) out.push([book, c, v, `Sample ${bi + 1} text ${c}.${v}`])
  })
  return out
}

function ok(result: ReturnType<typeof parseBibleFile>) {
  if (!result.ok) throw new Error(result.error)
  return result
}

describe('importing plain text', () => {
  it('reads "Book C:V text" lines', () => {
    const text = rows().map(([b, c, v, t]) => `${b} ${c}:${v} ${t}`).join('\n')
    const r = ok(parseBibleFile('niv-copy.txt', text))
    expect(r.stats).toMatchObject({ books: 66, chapters: 132, verses: 396, missingBooks: [], skippedLines: 0 })
    expect(r.books['John'][0][2]).toBe(`Sample 43 text 1.3`)
    expect(r.suggestedVersion).toBe('NIV-COPY')
  })

  it('reads numbered books, tabs, pipes and a byte-order mark', () => {
    const lines = rows().map(([b, c, v, t], i) =>
      i % 3 === 0 ? `${b}\t${c}\t${v}\t${t}` : i % 3 === 1 ? `${b}|${c}|${v}|${t}` : `${b} ${c}:${v}\t${t}`
    )
    const r = ok(parseBibleFile('x.txt', '﻿' + lines.join('\r\n')))
    expect(r.stats.verses).toBe(396)
    expect(r.books['1 John'][1][2]).toBe('Sample 62 text 2.3')
  })

  it('reads CSV with quoted text containing commas', () => {
    const csv = rows().map(([b, c, v, t]) => `"${b}",${c},${v},"${t}, with a comma"`).join('\n')
    const r = ok(parseBibleFile('bible.csv', csv))
    expect(r.books['Genesis'][0][0]).toBe('Sample 1 text 1.1, with a comma')
  })

  it('counts lines it cannot read and names unknown books', () => {
    const text = rows().map(([b, c, v, t]) => `${b} ${c}:${v} ${t}`).join('\n') + '\nNarnia 1:1 Not a book\nrandom words'
    const r = ok(parseBibleFile('x.txt', text))
    expect(r.stats.skippedLines).toBe(2)
    expect(r.stats.unknownBooks).toEqual(['Narnia'])
  })

  it('rejects files that are not Bibles', () => {
    const r = parseBibleFile('notes.txt', 'Just some notes\nabout the service\n')
    expect(r.ok).toBe(false)
  })
})

describe('importing Kiswahili', () => {
  it('matches Swahili book names and keeps them as display labels', () => {
    const swahili: Record<string, string> = { Genesis: 'Mwanzo', John: 'Yohana', '1 John': '1 Yohana', Revelation: 'Ufunuo wa Yohana' }
    const text = rows().map(([b, c, v, t]) => `${swahili[b] ?? b} ${c}:${v} ${t}`).join('\n')
    const r = ok(parseBibleFile('swahili.txt', text))
    expect(r.stats.books).toBe(66)
    expect(r.bookLabels).toEqual({ Genesis: 'Mwanzo', John: 'Yohana', '1 John': '1 Yohana', Revelation: 'Ufunuo wa Yohana' })

    registerBible(buildBibleText('SWTEST', 'Test Swahili', r.books, r.bookLabels))
    const ref = parseReference('Yohana 3:2')
    expect(ref?.book).toBe('John')
    expect(lookupPassage({ book: 'John', chapter: 2, verseStart: 1, verseEnd: 2 }, 'SWTEST')?.reference).toBe('Yohana 2:1–2')
    const john = lookupPassage({ book: 'John', chapter: 2, verseStart: 1 }, 'SWTEST')!
    expect(itemFromScripture(john).slides[0].reference).toBe('Yohana 2:1 (SWTEST)')
    unregisterBible('SWTEST')
  })

  it('understands Swahili references', () => {
    expect(parseReference('Mwanzo 1:1')?.book).toBe('Genesis')
    expect(parseReference('Zaburi 23')?.book).toBe('Psalms')
    expect(parseReference('Matendo ya Mitume 2:1-4')).toEqual({ book: 'Acts', chapter: 2, verseStart: 1, verseEnd: 4 })
    expect(parseReference('1 Wakorintho 13:4')?.book).toBe('1 Corinthians')
    expect(parseReference('Wimbo Ulio Bora 2:1')?.book).toBe('Song of Solomon')
    expect(parseReference('Hagai 1:1')?.book).toBe('Haggai')
    expect(parseReference('Malaki 3:10')?.book).toBe('Malachi')
    expect(parseReference('Tito 2:1')?.book).toBe('Titus')
    expect(parseReference('Kumbukumbu la Sheria 6:4')?.book).toBe('Deuteronomy')
  })
})

describe('importing JSON', () => {
  it('reads rows of book, chapter, verse and text, including numeric book ids', () => {
    const data = rows().map(([b, c, v, t], i) => ({ book: i % 2 ? b : BOOK_NAMES.indexOf(b) + 1, chapter: c, verse: v, text: t }))
    const r = ok(parseBibleFile('rows.json', JSON.stringify(data)))
    expect(r.stats.verses).toBe(396)
    expect(r.books['Matthew'][0][0]).toBe('Sample 40 text 1.1')
  })

  it('reads an array of books with chapters of verse strings', () => {
    const data = BOOK_NAMES.map((name, i) => ({ name, chapters: [[`a${i}`, `b${i}`], [`c${i}`, `d${i}`]].concat(Array.from({ length: 0 }, () => [])) }))
    const bigger = data.map((b) => ({ ...b, chapters: [...b.chapters, ['e', 'f'], ['g', 'h']] }))
    const r = ok(parseBibleFile('books.json', JSON.stringify(bigger)))
    expect(r.books['Genesis'][0]).toEqual(['a0', 'b0'])
    expect(r.stats.chapters).toBe(66 * 4)
  })

  it('reads this app\'s own format and the name inside it', () => {
    const books = Object.fromEntries(BOOK_NAMES.map((n) => [n, [['x', 'y', 'z'], ['x', 'y', 'z']]]))
    const r = ok(parseBibleFile('mine.json', JSON.stringify({ version: 'ABC', name: 'My Bible', books })))
    expect(r.suggestedName).toBe('My Bible')
    expect(r.stats.verses).toBe(396)
  })

  it('reads chapters shaped as { chapter, verses: [{ verse, text }] }', () => {
    const books = BOOK_NAMES.map((name) => ({
      name,
      chapters: [1, 2].map((chapter) => ({ chapter, verses: [1, 2, 3].map((verse) => ({ verse, text: `t${chapter}${verse}` })) }))
    }))
    const r = ok(parseBibleFile('x.json', JSON.stringify({ translation: 'Shaped', books })))
    expect(r.books['Jude'][1][2]).toBe('t23')
    expect(r.suggestedName).toBe('Shaped')
  })

  it('reports invalid JSON clearly', () => {
    expect(parseBibleFile('x.json', '{ nope')).toEqual({ ok: false, error: 'This file is not valid JSON.' })
  })
})

describe('verses a translation leaves out', () => {
  it('stores them as empty and skips them when looking up', () => {
    const text = rows().filter(([b, c, v]) => !(b === 'Matthew' && c === 1 && v === 2)).map(([b, c, v, t]) => `${b} ${c}:${v} ${t}`).join('\n')
    const r = ok(parseBibleFile('x.txt', text))
    expect(r.books['Matthew'][0][1]).toBe('')
    registerBible(buildBibleText('GAPTEST', 'Gap test', r.books, r.bookLabels))
    const passage = lookupPassage({ book: 'Matthew', chapter: 1, verseStart: 1, verseEnd: 3 }, 'GAPTEST')
    expect(passage?.verses.map((v) => v.verse)).toEqual([1, 3])
    expect(lookupPassage({ book: 'Matthew', chapter: 1, verseStart: 2 }, 'GAPTEST')).toBeNull()
    expect(installedVersions().some((v) => v.version === 'GAPTEST')).toBe(true)
    unregisterBible('GAPTEST')
  })

  it('lists books that are missing, so a New Testament only file is understood', () => {
    const text = rows(BOOK_NAMES.slice(39)).map(([b, c, v, t]) => `${b} ${c}:${v} ${t}`).join('\n')
    const r = ok(parseBibleFile('nt.txt', text))
    expect(r.stats.books).toBe(27)
    expect(r.stats.missingBooks).toHaveLength(39)
  })
})

describe('isBibleText', () => {
  const good = buildBibleText('NIV', 'Test', { John: [['a', 'b']] }, {})
  it('accepts a well-formed Bible', () => expect(isBibleText(good)).toBe(true))
  it('rejects bad versions, names, books and verses', () => {
    expect(isBibleText({ ...good, version: '../evil' })).toBe(false)
    expect(isBibleText({ ...good, version: '' })).toBe(false)
    expect(isBibleText({ ...good, name: '   ' })).toBe(false)
    expect(isBibleText({ ...good, books: { Narnia: [['a']] } })).toBe(false)
    expect(isBibleText({ ...good, books: { John: [[1]] } })).toBe(false)
    expect(isBibleText({ ...good, bookLabels: { John: 5 } })).toBe(false)
    expect(isBibleText(null)).toBe(false)
  })
})

describe('every Kiswahili book name resolves', () => {
  it('matches the 66 standard names', () => {
    const names = ['Mwanzo','Kutoka','Walawi','Hesabu','Kumbukumbu la Torati','Yoshua','Waamuzi','Ruthu','1 Samweli','2 Samweli','1 Wafalme','2 Wafalme','1 Mambo ya Nyakati','2 Mambo ya Nyakati','Ezra','Nehemia','Esta','Ayubu','Zaburi','Mithali','Mhubiri','Wimbo Ulio Bora','Isaya','Yeremia','Maombolezo','Ezekieli','Danieli','Hosea','Yoeli','Amosi','Obadia','Yona','Mika','Nahumu','Habakuki','Sefania','Hagai','Zekaria','Malaki','Mathayo','Marko','Luka','Yohana','Matendo ya Mitume','Warumi','1 Wakorintho','2 Wakorintho','Wagalatia','Waefeso','Wafilipi','Wakolosai','1 Wathesalonike','2 Wathesalonike','1 Timotheo','2 Timotheo','Tito','Filemoni','Waebrania','Yakobo','1 Petro','2 Petro','1 Yohana','2 Yohana','3 Yohana','Yuda','Ufunuo wa Yohana']
    expect(names).toHaveLength(66)
    expect(names.map((n) => parseReference(`${n} 1:1`)?.book)).toEqual([...BOOK_NAMES])
  })
})

describe('typing references the way people really type them', () => {
  const john316 = { book: 'John', chapter: 3, verseStart: 16 }
  it.each([
    'John 3:16', 'john 3:16', 'John 3.16', 'John 3 16', 'Jn 3:16', 'John chapter 3 verse 16', 'john ch 3 v 16',
    'Jn3v16', 'John 3 verse 16', 'John 3:16 ', '  JOHN   3 : 16', 'Yohana sura 3 aya 16', 'Yohana 3:16'
  ])('reads "%s"', (typed) => {
    expect(parseReference(typed)).toEqual(john316)
  })

  it('reads ranges written in different ways', () => {
    const range = { book: 'John', chapter: 3, verseStart: 16, verseEnd: 18 }
    for (const typed of ['John 3:16-18', 'John 3 16-18', 'John 3:16 to 18', 'John 3 verses 16 to 18', 'John 3:16–18', 'John 3:18-16', 'john 3:16 through 18', 'John 3 verse 16 and 18']) {
      expect(parseReference(typed)).toEqual(range)
    }
  })

  it('reads whole chapters and numbered books', () => {
    expect(parseReference('Psalm 23')).toEqual({ book: 'Psalms', chapter: 23 })
    expect(parseReference('Psalm chapter 23')).toEqual({ book: 'Psalms', chapter: 23 })
    expect(parseReference('1 John 4 8')).toEqual({ book: '1 John', chapter: 4, verseStart: 8 })
    expect(parseReference('1john 4:8')).toEqual({ book: '1 John', chapter: 4, verseStart: 8 })
    expect(parseReference('2 Cor 5:17')).toEqual({ book: '2 Corinthians', chapter: 5, verseStart: 17 })
    expect(parseReference('Song of Solomon 2 1')).toEqual({ book: 'Song of Solomon', chapter: 2, verseStart: 1 })
  })

  it('accepts a clear start of a book name, but not an ambiguous one', () => {
    expect(parseReference('Revel 22:21')?.book).toBe('Revelation')
    expect(parseReference('Ecclesi 3:1')?.book).toBe('Ecclesiastes')
    expect(parseReference('Corinth 5:17')).toBeNull()
    expect(parseReference('Jo 3:16')).toBeNull()
  })

  it('does not treat ordinary words as references', () => {
    expect(parseReference('for God so loved')).toBeNull()
    expect(parseReference('the lord is my shepherd')).toBeNull()
    expect(parseReference('')).toBeNull()
  })
})

describe('searching verses by words', () => {
  it('finds a verse from words typed from memory', () => {
    const hits = searchVerses('God so loved the world')
    expect(hits[0].reference).toBe('John 3:16')
    expect(hits[0].text).toMatch(/^For God so loved the world/)
  })

  it('needs every word, ignores case and punctuation, and returns Bible order', () => {
    const hits = searchVerses("LORD, is my shepherd")
    expect(hits[0].reference).toBe('Psalms 23:1')
    expect(searchVerses('zzzzqqq')).toEqual([])
    expect(searchVerses('   ')).toEqual([])
    const order = searchVerses('love', 'KJV', 15).map((h) => h.book)
    expect(order).toEqual([...order].sort((a, b) => BOOK_NAMES.indexOf(a) - BOOK_NAMES.indexOf(b)))
  })

  it('limits the number of results and handles missing versions', () => {
    expect(searchVerses('the', 'KJV', 5)).toHaveLength(5)
    expect(searchVerses('the', 'NOPE')).toEqual([])
  })
})

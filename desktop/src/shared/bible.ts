export interface BibleReference {
  book: string
  chapter: number
  verseStart?: number
  verseEnd?: number
}

export interface BibleVerse {
  verse: number
  text: string
}

export interface BibleResult {
  version: string
  book: string
  chapter: number
  reference: string
  verses: BibleVerse[]
}

const BOOKS: Array<[string, string[]]> = [
  ['Genesis', ['gen', 'ge', 'gn']],
  ['Exodus', ['exod', 'exo', 'ex']],
  ['Leviticus', ['lev', 'le', 'lv']],
  ['Numbers', ['num', 'nu', 'nm']],
  ['Deuteronomy', ['deut', 'dt', 'de']],
  ['Joshua', ['josh', 'jos']],
  ['Judges', ['judg', 'jdg', 'jg']],
  ['Ruth', ['ru', 'rth']],
  ['1 Samuel', ['1sam', '1sa', '1sm']],
  ['2 Samuel', ['2sam', '2sa', '2sm']],
  ['1 Kings', ['1kgs', '1ki', '1kin']],
  ['2 Kings', ['2kgs', '2ki', '2kin']],
  ['1 Chronicles', ['1chron', '1chr', '1ch']],
  ['2 Chronicles', ['2chron', '2chr', '2ch']],
  ['Ezra', ['ezr']],
  ['Nehemiah', ['neh', 'ne']],
  ['Esther', ['esth', 'est', 'es']],
  ['Job', ['jb']],
  ['Psalms', ['psalm', 'ps', 'psa', 'pslm']],
  ['Proverbs', ['prov', 'pro', 'pr', 'prv']],
  ['Ecclesiastes', ['eccles', 'eccl', 'ecc', 'ec']],
  ['Song of Solomon', ['song of songs', 'song', 'sos', 'sng']],
  ['Isaiah', ['isa', 'is']],
  ['Jeremiah', ['jer', 'je']],
  ['Lamentations', ['lam', 'la']],
  ['Ezekiel', ['ezek', 'eze', 'ezk']],
  ['Daniel', ['dan', 'da', 'dn']],
  ['Hosea', ['hos', 'ho']],
  ['Joel', ['jl']],
  ['Amos', ['am']],
  ['Obadiah', ['obad', 'ob']],
  ['Jonah', ['jon', 'jnh']],
  ['Micah', ['mic', 'mc']],
  ['Nahum', ['nah', 'na']],
  ['Habakkuk', ['hab', 'hb']],
  ['Zephaniah', ['zeph', 'zep', 'zp']],
  ['Haggai', ['hag', 'hg']],
  ['Zechariah', ['zech', 'zec', 'zc']],
  ['Malachi', ['mal', 'ml']],
  ['Matthew', ['matt', 'mat', 'mt']],
  ['Mark', ['mrk', 'mar', 'mk']],
  ['Luke', ['luk', 'lk']],
  ['John', ['joh', 'jhn', 'jn']],
  ['Acts', ['act', 'ac']],
  ['Romans', ['rom', 'ro', 'rm']],
  ['1 Corinthians', ['1cor', '1co']],
  ['2 Corinthians', ['2cor', '2co']],
  ['Galatians', ['gal', 'ga']],
  ['Ephesians', ['eph', 'ephes']],
  ['Philippians', ['phil', 'php', 'pp']],
  ['Colossians', ['col', 'co']],
  ['1 Thessalonians', ['1thess', '1thes', '1th']],
  ['2 Thessalonians', ['2thess', '2thes', '2th']],
  ['1 Timothy', ['1tim', '1ti']],
  ['2 Timothy', ['2tim', '2ti']],
  ['Titus', ['tit', 'ti']],
  ['Philemon', ['philem', 'phm', 'pm']],
  ['Hebrews', ['heb']],
  ['James', ['jas', 'jm']],
  ['1 Peter', ['1pet', '1pe', '1pt']],
  ['2 Peter', ['2pet', '2pe', '2pt']],
  ['1 John', ['1jn', '1jo', '1joh']],
  ['2 John', ['2jn', '2jo', '2joh']],
  ['3 John', ['3jn', '3jo', '3joh']],
  ['Jude', ['jud', 'jd']],
  ['Revelation', ['rev', 're', 'rv', 'revelations']]
]

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^([1-3])\s+/, '$1')
}

const BOOK_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>()
  for (const [name, aliases] of BOOKS) {
    map.set(normalize(name), name)
    for (const alias of aliases) {
      const key = normalize(alias)
      if (!map.has(key)) map.set(key, name)
    }
  }
  return map
})()

export function resolveBook(raw: string): string | null {
  return BOOK_LOOKUP.get(normalize(raw)) ?? null
}

const REFERENCE_PATTERN =
  /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z.\s]*?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?\s*$/

export function parseReference(input: string): BibleReference | null {
  const match = REFERENCE_PATTERN.exec(input)
  if (!match) return null
  const book = resolveBook(match[1])
  if (!book) return null
  const chapter = Number(match[2])
  if (chapter < 1) return null
  const reference: BibleReference = { book, chapter }
  if (match[3] !== undefined) {
    let start = Number(match[3])
    let end = match[4] !== undefined ? Number(match[4]) : undefined
    if (end !== undefined && end < start) {
      const swap = start
      start = end
      end = swap
    }
    reference.verseStart = start
    if (end !== undefined && end !== start) reference.verseEnd = end
  }
  return reference
}

export function formatReference(ref: BibleReference): string {
  if (ref.verseStart === undefined) return `${ref.book} ${ref.chapter}`
  const end = ref.verseEnd !== undefined && ref.verseEnd !== ref.verseStart ? `–${ref.verseEnd}` : ''
  return `${ref.book} ${ref.chapter}:${ref.verseStart}${end}`
}

export interface BibleText {
  version: string
  name: string
  /** Canonical book name -> chapters -> verses. chapters[0][0] is chapter 1, verse 1. */
  books: Record<string, string[][]>
}

const installed = new Map<string, BibleText>()

export function registerBible(bible: BibleText): void {
  installed.set(bible.version, bible)
}

export function installedVersions(): { version: string; name: string }[] {
  return [...installed.values()].map(({ version, name }) => ({ version, name }))
}

export function lookupPassage(ref: BibleReference, version = 'KJV'): BibleResult | null {
  const chapter = installed.get(version)?.books[ref.book]?.[ref.chapter - 1]
  if (!chapter || chapter.length === 0) return null

  const start = ref.verseStart ?? 1
  const end = Math.min(ref.verseEnd ?? (ref.verseStart === undefined ? chapter.length : start), chapter.length)
  if (start < 1 || start > end) return null

  const verses = []
  for (let verse = start; verse <= end; verse++) verses.push({ verse, text: chapter[verse - 1] })

  const reference =
    ref.verseStart === undefined
      ? `${ref.book} ${ref.chapter}`
      : formatReference({ book: ref.book, chapter: ref.chapter, verseStart: start, verseEnd: end })

  return { version, book: ref.book, chapter: ref.chapter, reference, verses }
}

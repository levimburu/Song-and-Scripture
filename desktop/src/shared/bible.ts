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
  /** The book name as this Bible spells it (for example "Yohana"). */
  bookLabel: string
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

// Kiswahili book names, so Swahili Bibles and Swahili references like "Yohana 3:16" work.
const SWAHILI_NAMES: Array<[string, string[]]> = [
  ['Genesis', ['Mwanzo']],
  ['Haggai', ['Hagai']],
  ['Malachi', ['Malaki']],
  ['Titus', ['Tito']],
  ['Exodus', ['Kutoka']],
  ['Leviticus', ['Walawi', 'Mambo ya Walawi']],
  ['Numbers', ['Hesabu']],
  ['Deuteronomy', ['Kumbukumbu la Torati', 'Kumbukumbu la Sheria', 'Kumbukumbu']],
  ['Joshua', ['Yoshua']],
  ['Judges', ['Waamuzi']],
  ['Ruth', ['Ruthu']],
  ['1 Samuel', ['1 Samweli']],
  ['2 Samuel', ['2 Samweli']],
  ['1 Kings', ['1 Wafalme']],
  ['2 Kings', ['2 Wafalme']],
  ['1 Chronicles', ['1 Mambo ya Nyakati', '1 Nyakati']],
  ['2 Chronicles', ['2 Mambo ya Nyakati', '2 Nyakati']],
  ['Nehemiah', ['Nehemia']],
  ['Esther', ['Esta']],
  ['Job', ['Ayubu']],
  ['Psalms', ['Zaburi']],
  ['Proverbs', ['Mithali']],
  ['Ecclesiastes', ['Mhubiri']],
  ['Song of Solomon', ['Wimbo Ulio Bora', 'Wimbo Bora', 'Wimbo wa Sulemani']],
  ['Isaiah', ['Isaya']],
  ['Jeremiah', ['Yeremia']],
  ['Lamentations', ['Maombolezo']],
  ['Ezekiel', ['Ezekieli']],
  ['Daniel', ['Danieli']],
  ['Joel', ['Yoeli']],
  ['Amos', ['Amosi']],
  ['Obadiah', ['Obadia']],
  ['Jonah', ['Yona']],
  ['Micah', ['Mika']],
  ['Nahum', ['Nahumu']],
  ['Habakkuk', ['Habakuki']],
  ['Zephaniah', ['Sefania']],
  ['Zechariah', ['Zekaria']],
  ['Matthew', ['Mathayo']],
  ['Mark', ['Marko']],
  ['Luke', ['Luka']],
  ['John', ['Yohana']],
  ['Acts', ['Matendo ya Mitume', 'Matendo']],
  ['Romans', ['Warumi']],
  ['1 Corinthians', ['1 Wakorintho']],
  ['2 Corinthians', ['2 Wakorintho']],
  ['Galatians', ['Wagalatia']],
  ['Ephesians', ['Waefeso']],
  ['Philippians', ['Wafilipi']],
  ['Colossians', ['Wakolosai']],
  ['1 Thessalonians', ['1 Wathesalonike']],
  ['2 Thessalonians', ['2 Wathesalonike']],
  ['1 Timothy', ['1 Timotheo']],
  ['2 Timothy', ['2 Timotheo']],
  ['Philemon', ['Filemoni']],
  ['Hebrews', ['Waebrania']],
  ['James', ['Yakobo']],
  ['1 Peter', ['1 Petro']],
  ['2 Peter', ['2 Petro']],
  ['1 John', ['1 Yohana']],
  ['2 John', ['2 Yohana']],
  ['3 John', ['3 Yohana']],
  ['Jude', ['Yuda']],
  ['Revelation', ['Ufunuo wa Yohana', 'Ufunuo']]
]
for (const [name, aliases] of SWAHILI_NAMES) {
  for (const alias of aliases) {
    const key = normalize(alias)
    if (!BOOK_LOOKUP.has(key)) BOOK_LOOKUP.set(key, name)
  }
}

/** The 66 canonical book names in Bible order. */
export const BOOK_NAMES: readonly string[] = BOOKS.map(([name]) => name)

export function resolveBook(raw: string): string | null {
  const key = normalize(raw)
  const exact = BOOK_LOOKUP.get(key)
  if (exact) return exact
  // A unique start of a book name is enough ("revel" -> Revelation), as long as it is not ambiguous.
  if (key.length < 3) return null
  const matches = new Set<string>()
  for (const [alias, book] of BOOK_LOOKUP) if (alias.startsWith(key)) matches.add(book)
  return matches.size === 1 ? [...matches][0] : null
}

const REFERENCE_PATTERN =
  /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z.\s]*?)\s*(\d{1,3})(?:\s*(?:[:.]|\s)\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?\s*$/

// Turns the many ways people type a reference into "Book 3:16-18":
// "John chapter 3 verse 16", "john 3 16 to 18", "Jn3v16", "Yohana sura 3 aya 16".
function tidyReference(input: string): string {
  return input
    .replace(/\b(?:chapter|chap|ch|sura)\b\.?/gi, ' ')
    .replace(/(\d)\s*(?:verses?|vss?|vs|v|aya|mistari)\.?\s*(?=\d)/gi, '$1:')
    .replace(/(\d)\s*(?:to|through|thru|hadi)\s*(?=\d)/gi, '$1-')
    .replace(/(\d)\s*(?:and|&)\s*(?=\d)/gi, '$1-')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseReference(input: string): BibleReference | null {
  const match = REFERENCE_PATTERN.exec(tidyReference(input))
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
  /** How this Bible spells book names (for example "Yohana" for John). Defaults to the English names. */
  bookLabels?: Record<string, string>
}

const installed = new Map<string, BibleText>()

export function registerBible(bible: BibleText): void {
  installed.set(bible.version, bible)
}

export function unregisterBible(version: string): void {
  installed.delete(version)
}

export function installedVersions(): { version: string; name: string }[] {
  return [...installed.values()].map(({ version, name }) => ({ version, name }))
}

export function lookupPassage(ref: BibleReference, version = 'KJV'): BibleResult | null {
  const bible = installed.get(version)
  const chapter = bible?.books[ref.book]?.[ref.chapter - 1]
  if (!bible || !chapter || chapter.length === 0) return null

  const start = ref.verseStart ?? 1
  const end = Math.min(ref.verseEnd ?? (ref.verseStart === undefined ? chapter.length : start), chapter.length)
  if (start < 1 || start > end) return null

  // Some translations leave verses out on purpose (stored as ''), so skip those.
  const verses = []
  for (let verse = start; verse <= end; verse++) {
    if (chapter[verse - 1].trim() !== '') verses.push({ verse, text: chapter[verse - 1] })
  }
  if (verses.length === 0) return null

  const label = bible.bookLabels?.[ref.book] ?? ref.book
  const reference =
    ref.verseStart === undefined
      ? `${label} ${ref.chapter}`
      : formatReference({
          book: label,
          chapter: ref.chapter,
          verseStart: verses[0].verse,
          verseEnd: verses[verses.length - 1].verse
        })

  return { version, book: ref.book, bookLabel: label, chapter: ref.chapter, reference, verses }
}

export interface VerseHit {
  book: string
  chapter: number
  verse: number
  text: string
  /** For example "John 3:16", using this Bible's own book names. */
  reference: string
}

/** Finds verses containing every word typed (in any order), in Bible order. */
export function searchVerses(query: string, version = 'KJV', limit = 30): VerseHit[] {
  const bible = installed.get(version)
  const words = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
  if (!bible || words.length === 0) return []
  const hits: VerseHit[] = []
  for (const book of BOOK_NAMES) {
    const chapters = bible.books[book]
    if (!chapters) continue
    const label = bible.bookLabels?.[book] ?? book
    for (let c = 0; c < chapters.length; c++) {
      for (let v = 0; v < chapters[c].length; v++) {
        const text = chapters[c][v]
        if (text === '') continue
        const lower = text.toLowerCase()
        if (words.every((w) => lower.includes(w))) {
          hits.push({ book, chapter: c + 1, verse: v + 1, text, reference: `${label} ${c + 1}:${v + 1}` })
          if (hits.length >= limit) return hits
        }
      }
    }
  }
  return hits
}

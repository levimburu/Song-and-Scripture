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

type ChapterText = Record<number, string>

// Starter text so the app can be demonstrated. The full King James Version
// (public domain) replaces this in the Bible module milestone.
const SAMPLE_KJV: Record<string, Record<number, ChapterText>> = {
  John: {
    3: {
      16: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      17: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.'
    }
  },
  Romans: {
    8: {
      35: 'Who shall separate us from the love of Christ? shall tribulation, or distress, or persecution, or famine, or nakedness, or peril, or sword?',
      36: 'As it is written, For thy sake we are killed all the day long; we are accounted as sheep for the slaughter.',
      37: 'Nay, in all these things we are more than conquerors through him that loved us.',
      38: 'For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come,',
      39: 'Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.'
    }
  },
  Psalms: {
    23: {
      1: 'The LORD is my shepherd; I shall not want.',
      2: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.',
      3: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.',
      4: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.',
      5: 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.',
      6: 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.'
    }
  }
}

export function lookupPassage(ref: BibleReference, version = 'KJV'): BibleResult | null {
  const chapterText = SAMPLE_KJV[ref.book]?.[ref.chapter]
  if (!chapterText) return null

  const available = Object.keys(chapterText)
    .map(Number)
    .sort((a, b) => a - b)

  let wanted = available
  if (ref.verseStart !== undefined) {
    const start = ref.verseStart
    const end = ref.verseEnd ?? start
    wanted = available.filter((verse) => verse >= start && verse <= end)
  }
  if (wanted.length === 0) return null

  const verses = wanted.map((verse) => ({ verse, text: chapterText[verse] }))
  const first = wanted[0]
  const last = wanted[wanted.length - 1]
  const reference =
    ref.verseStart === undefined
      ? `${ref.book} ${ref.chapter}`
      : formatReference({ book: ref.book, chapter: ref.chapter, verseStart: first, verseEnd: last })

  return { version, book: ref.book, chapter: ref.chapter, reference, verses }
}

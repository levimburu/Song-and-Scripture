import { BOOK_NAMES, resolveBook, type BibleText } from './bible'

export interface ImportStats {
  books: number
  chapters: number
  verses: number
  /** Canonical names of books that have no verses in the file. */
  missingBooks: string[]
  /** Book names in the file that could not be matched. */
  unknownBooks: string[]
  skippedLines: number
}

export type ImportResult =
  | {
      ok: true
      books: Record<string, string[][]>
      bookLabels: Record<string, string>
      stats: ImportStats
      suggestedVersion: string
      suggestedName: string
    }
  | { ok: false; error: string }

const MIN_VERSES = 100

class Collector {
  private data = new Map<string, Map<number, Map<number, string>>>()
  private labels: Record<string, string> = {}
  readonly unknown = new Set<string>()
  skipped = 0

  add(bookRaw: string, chapter: number, verse: number, text: string): void {
    const raw = bookRaw.trim()
    const book = BOOK_NAMES.includes(raw) ? raw : resolveBook(raw)
    if (!book) {
      this.unknown.add(raw)
      this.skipped++
      return
    }
    if (!Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1 || chapter > 200 || verse > 200) {
      this.skipped++
      return
    }
    if (raw !== book && !(book in this.labels)) this.labels[book] = raw
    let chapters = this.data.get(book)
    if (!chapters) this.data.set(book, (chapters = new Map()))
    let verses = chapters.get(chapter)
    if (!verses) chapters.set(chapter, (verses = new Map()))
    verses.set(verse, text.replace(/\s+/g, ' ').trim())
  }

  finish(fileName: string, suggestedName = ''): ImportResult {
    const books: Record<string, string[][]> = {}
    let chapterCount = 0
    let verseCount = 0
    for (const name of BOOK_NAMES) {
      const chapters = this.data.get(name)
      if (!chapters) continue
      const lastChapter = Math.max(...chapters.keys())
      const out: string[][] = []
      for (let c = 1; c <= lastChapter; c++) {
        const verses = chapters.get(c)
        if (!verses) {
          out.push([])
          continue
        }
        const lastVerse = Math.max(...verses.keys())
        const row: string[] = []
        for (let v = 1; v <= lastVerse; v++) row.push(verses.get(v) ?? '')
        out.push(row)
        chapterCount++
        verseCount += [...verses.values()].filter((t) => t !== '').length
      }
      books[name] = out
    }
    if (verseCount < MIN_VERSES) {
      return {
        ok: false,
        error: `Only ${verseCount} verses could be read from this file. It does not look like a Bible in a supported format.`
      }
    }
    const base = fileName.replace(/\.[^.]*$/, '')
    return {
      ok: true,
      books,
      bookLabels: this.labels,
      stats: {
        books: Object.keys(books).length,
        chapters: chapterCount,
        verses: verseCount,
        missingBooks: BOOK_NAMES.filter((n) => !(n in books)),
        unknownBooks: [...this.unknown].slice(0, 10),
        skippedLines: this.skipped
      },
      suggestedVersion: base.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase().slice(0, 12) || 'BIBLE',
      suggestedName: suggestedName || base
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function bookFromNumber(value: unknown): string | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(n) && n >= 1 && n <= BOOK_NAMES.length ? BOOK_NAMES[n - 1] : null
}

function bookName(row: Record<string, unknown>): string | null {
  for (const key of ['book', 'book_name', 'bookName', 'name', 'abbrev']) {
    const v = row[key]
    if (typeof v === 'string' && v.trim() !== '') return v
  }
  return bookFromNumber(row.book ?? row.book_id ?? row.bookId)
}

function toInt(value: unknown): number {
  return typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
}

function parseJson(text: string, fileName: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  const col = new Collector()
  let name = ''

  const addChapters = (book: string, chapters: unknown): void => {
    if (!Array.isArray(chapters)) return
    chapters.forEach((chapter, ci) => {
      if (Array.isArray(chapter)) {
        chapter.forEach((t, vi) => typeof t === 'string' && col.add(book, ci + 1, vi + 1, t))
      } else if (isRecord(chapter) && Array.isArray(chapter.verses)) {
        const number = toInt(chapter.chapter) || ci + 1
        chapter.verses.forEach((v, vi) => {
          if (isRecord(v) && typeof v.text === 'string') col.add(book, number, toInt(v.verse) || vi + 1, v.text)
        })
      }
    })
  }

  if (isRecord(data) && isRecord(data.books) && !Array.isArray(data.books)) {
    if (typeof data.name === 'string') name = data.name
    for (const [book, chapters] of Object.entries(data.books)) addChapters(book, chapters)
  } else if (isRecord(data) && Array.isArray(data.books)) {
    if (typeof data.translation === 'string') name = data.translation
    for (const b of data.books) if (isRecord(b)) addChapters(bookName(b) ?? '', b.chapters)
  } else if (Array.isArray(data) && data.every(isRecord) && data.some((r) => Array.isArray(r.chapters))) {
    for (const b of data as Record<string, unknown>[]) addChapters(bookName(b) ?? '', b.chapters)
  } else if (Array.isArray(data) && data.every(isRecord)) {
    for (const row of data as Record<string, unknown>[]) {
      const book = bookName(row)
      const verseText = row.text ?? row.verse_text ?? row.content
      if (book && typeof verseText === 'string') col.add(book, toInt(row.chapter), toInt(row.verse), verseText)
      else col.skipped++
    }
  } else if (isRecord(data)) {
    for (const [book, chapters] of Object.entries(data)) {
      if (!isRecord(chapters)) continue
      for (const [c, verses] of Object.entries(chapters)) {
        if (!isRecord(verses)) continue
        for (const [v, t] of Object.entries(verses)) typeof t === 'string' ? col.add(book, Number(c), Number(v), t) : col.skipped++
      }
    }
  }
  return col.finish(fileName, name)
}

function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

const LINE_PATTERN = /^\s*(.+?)\s+(\d{1,3})\s*:\s*(\d{1,3})\s*[\t|,;.:\-–—]?\s*(.*)$/

function parseText(text: string, fileName: string): ImportResult {
  const col = new Collector()
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    const delimited = line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : null
    const parts = delimited ?? (line.includes(',') ? splitCsv(line) : null)
    if (parts && parts.length >= 4 && /^\d+$/.test(parts[1].trim()) && /^\d+$/.test(parts[2].trim())) {
      col.add(parts[0], Number(parts[1]), Number(parts[2]), parts.slice(3).join(' '))
      continue
    }
    const m = LINE_PATTERN.exec(line)
    if (m) col.add(m[1], Number(m[2]), Number(m[3]), m[4])
    else col.skipped++
  }
  return col.finish(fileName)
}

/**
 * Reads a Bible from a file the church supplies. Supported:
 *  - JSON: this app's format, arrays of books with chapters, rows of book/chapter/verse/text, or nested objects
 *  - Text, CSV, TSV: one verse per line, like "John 3:16 For God so loved..." or "John,3,16,For God..."
 * Book names can be English or Kiswahili.
 */
export function parseBibleFile(fileName: string, rawText: string): ImportResult {
  const text = rawText.replace(/^﻿/, '')
  const trimmed = text.trimStart()
  const looksJson = /\.json$/i.test(fileName) || trimmed.startsWith('{') || trimmed.startsWith('[')
  return looksJson ? parseJson(text, fileName) : parseText(text, fileName)
}

export function buildBibleText(
  version: string,
  name: string,
  books: Record<string, string[][]>,
  bookLabels: Record<string, string>
): BibleText {
  const bible: BibleText = { version, name, books }
  if (Object.keys(bookLabels).length > 0) bible.bookLabels = bookLabels
  return bible
}

export const VERSION_PATTERN = /^[A-Za-z0-9_-]{1,12}$/

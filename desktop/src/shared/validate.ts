import { BOOK_NAMES, type BibleText } from './bible'
import { VERSION_PATTERN } from './bibleImport'
import type { ItemStatus, ItemType, ScheduleItem, SectionKind, Segment, Slide } from './types'

const ITEM_TYPES: ReadonlySet<string> = new Set<ItemType>([
  'info',
  'song',
  'scripture',
  'announcement',
  'offering',
  'video',
  'image'
])
const ITEM_STATUSES: ReadonlySet<string> = new Set<ItemStatus>(['ready', 'missing'])
const SLIDE_KINDS: ReadonlySet<string> = new Set<SectionKind>([
  'verse',
  'chorus',
  'bridge',
  'scripture',
  'text'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSlide(value: unknown): value is Slide {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    SLIDE_KINDS.has(value.kind) &&
    typeof value.label === 'string' &&
    Array.isArray(value.lines) &&
    value.lines.every((line) => typeof line === 'string') &&
    (value.reference === undefined || typeof value.reference === 'string')
  )
}

export function isScheduleItem(value: unknown): value is ScheduleItem {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.type === 'string' &&
    ITEM_TYPES.has(value.type) &&
    typeof value.status === 'string' &&
    ITEM_STATUSES.has(value.status) &&
    Array.isArray(value.slides) &&
    value.slides.every(isSlide) &&
    (value.background === undefined || value.background === null || typeof value.background === 'string') &&
    (value.segmentId === undefined || typeof value.segmentId === 'string')
  )
}

export function isSegments(value: unknown): value is Segment[] {
  return (
    Array.isArray(value) &&
    value.length <= 30 &&
    value.every((s) => isRecord(s) && typeof s.id === 'string' && typeof s.name === 'string' && s.name.length <= 60)
  )
}

export function isScheduleItems(value: unknown): value is ScheduleItem[] {
  return Array.isArray(value) && value.every(isScheduleItem)
}

export const MAX_BIBLE_VERSES = 40000

/** Checks a Bible text before it is saved or registered. */
export function isBibleText(value: unknown): value is BibleText {
  if (!isRecord(value)) return false
  if (typeof value.version !== 'string' || !VERSION_PATTERN.test(value.version)) return false
  if (typeof value.name !== 'string' || value.name.trim() === '' || value.name.length > 80) return false
  if (!isRecord(value.books)) return false
  let verses = 0
  for (const [book, chapters] of Object.entries(value.books)) {
    if (!BOOK_NAMES.includes(book) || !Array.isArray(chapters) || chapters.length > 200) return false
    for (const chapter of chapters) {
      if (!Array.isArray(chapter) || chapter.length > 200) return false
      for (const text of chapter) {
        if (typeof text !== 'string' || text.length > 5000) return false
        verses++
      }
    }
  }
  if (verses > MAX_BIBLE_VERSES) return false
  if (value.bookLabels !== undefined) {
    if (!isRecord(value.bookLabels)) return false
    for (const [book, label] of Object.entries(value.bookLabels)) {
      if (!BOOK_NAMES.includes(book) || typeof label !== 'string' || label.length > 60) return false
    }
  }
  return true
}

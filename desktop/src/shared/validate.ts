import type { ItemStatus, ItemType, ScheduleItem, SectionKind, Slide } from './types'

const ITEM_TYPES: ReadonlySet<string> = new Set<ItemType>([
  'info',
  'song',
  'scripture',
  'announcement',
  'offering',
  'video'
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
    value.slides.every(isSlide)
  )
}

export function isScheduleItems(value: unknown): value is ScheduleItem[] {
  return Array.isArray(value) && value.every(isScheduleItem)
}

import { uid } from './ids'
import type { ScheduleItem, Segment, SlotHint } from './types'

export const MAX_SEGMENTS = 30
export const MAX_SEGMENT_NAME = 60

export function newSegment(name: string): Segment {
  return { id: uid('seg'), name: name.trim().slice(0, MAX_SEGMENT_NAME) }
}

export interface Group {
  /** null for items that belong to no segment. */
  segment: Segment | null
  items: ScheduleItem[]
}

/** The schedule as the operator reads it: loose items first, then each segment in order. */
export function groupItems(items: ScheduleItem[], segments: Segment[]): Group[] {
  const known = new Set(segments.map((s) => s.id))
  const loose = items.filter((item) => !item.segmentId || !known.has(item.segmentId))
  const groups: Group[] = []
  if (loose.length > 0 || segments.length === 0) groups.push({ segment: null, items: loose })
  for (const segment of segments) groups.push({ segment, items: items.filter((item) => item.segmentId === segment.id) })
  return groups
}

/** Items in the order they are shown, which is the order Go live steps through. */
export function displayOrder(items: ScheduleItem[], segments: Segment[]): ScheduleItem[] {
  return groupItems(items, segments).flatMap((g) => g.items)
}

/** Moves a segment up (-1) or down (+1). */
export function moveSegment(segments: Segment[], id: string, delta: number): Segment[] {
  const from = segments.findIndex((s) => s.id === id)
  if (from === -1) return segments
  const to = Math.min(segments.length - 1, Math.max(0, from + delta))
  if (to === from) return segments
  const next = [...segments]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Swaps an item with its neighbour inside the same segment. */
export function moveWithinSegment(items: ScheduleItem[], segments: Segment[], id: string, delta: number): ScheduleItem[] {
  const group = groupItems(items, segments).find((g) => g.items.some((item) => item.id === id))
  if (!group) return items
  const at = group.items.findIndex((item) => item.id === id)
  const other = group.items[at + delta]
  if (!other) return items
  const a = items.findIndex((item) => item.id === id)
  const b = items.findIndex((item) => item.id === other.id)
  const next = [...items]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

const SLOT_LABEL: Record<SlotHint, string> = { song: 'Song', scripture: 'Scripture', program: 'Program entry' }

export function slotLabel(hint: SlotHint): string {
  return SLOT_LABEL[hint]
}

/** A blank spot in the plan, to be filled with a song, a scripture or a program entry. */
export function newSlot(hint: SlotHint, segmentId?: string): ScheduleItem {
  const item: ScheduleItem = {
    id: uid('slot'),
    type: hint === 'song' ? 'song' : hint === 'scripture' ? 'scripture' : 'announcement',
    title: SLOT_LABEL[hint],
    slides: [],
    status: 'ready',
    slot: hint
  }
  return segmentId ? { ...item, segmentId } : item
}

function hintOf(item: ScheduleItem): SlotHint | null {
  if (item.slot) return item.slot
  if (item.type === 'song') return 'song'
  if (item.type === 'scripture') return 'scripture'
  if (item.type === 'announcement') return 'program'
  return null
}

/**
 * Getting ready for next Sunday: songs, scriptures and program entries go back to blank spots,
 * while fixed things (welcome, offering, videos, posters) stay as they are.
 */
export function startNewWeek(items: ScheduleItem[]): ScheduleItem[] {
  return items.map((item) => {
    const hint = hintOf(item)
    return hint ? newSlot(hint, item.segmentId) : item
  })
}

export function openSlots(items: ScheduleItem[]): number {
  return items.filter((item) => item.slot !== undefined).length
}

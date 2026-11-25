import { uid } from './ids'
import type { ScheduleItem, Segment } from './types'

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

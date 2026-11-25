import type { BibleResult } from './bible'
import { uid } from './ids'
import { splitLyrics } from './lyrics'
import type { ItemStatus, ItemType, ScheduleItem } from './types'

export function itemFromSong(title: string, lyrics: string): ScheduleItem {
  const id = uid('item')
  return {
    id,
    type: 'song',
    title,
    slides: splitLyrics(lyrics, { idPrefix: id }),
    status: 'ready'
  }
}

export function itemFromScripture(result: BibleResult): ScheduleItem {
  const id = uid('item')
  return {
    id,
    type: 'scripture',
    title: result.reference,
    status: 'ready',
    slides: result.verses.map((verse) => ({
      id: `${id}-${verse.verse}`,
      kind: 'scripture',
      label: `${result.chapter}:${verse.verse}`,
      lines: [verse.text],
      reference: `${result.bookLabel} ${result.chapter}:${verse.verse} (${result.version})`
    }))
  }
}

export function itemFromText(
  type: Exclude<ItemType, 'song' | 'scripture'>,
  title: string,
  lines: string[],
  status: ItemStatus = 'ready'
): ScheduleItem {
  const id = uid('item')
  return {
    id,
    type,
    title,
    status,
    slides: [{ id: `${id}-1`, kind: 'text', label: title, lines }]
  }
}

export function addItem(items: ScheduleItem[], item: ScheduleItem): ScheduleItem[] {
  return [...items, item]
}

export function removeItem(items: ScheduleItem[], id: string): ScheduleItem[] {
  return items.filter((item) => item.id !== id)
}

export function moveItem(items: ScheduleItem[], id: string, delta: number): ScheduleItem[] {
  const from = items.findIndex((item) => item.id === id)
  if (from === -1) return items
  const to = Math.min(items.length - 1, Math.max(0, from + delta))
  if (to === from) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

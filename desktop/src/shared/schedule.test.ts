import { describe, expect, it } from 'vitest'
import { lookupPassage } from './bible'
import { addItem, itemFromScripture, itemFromSong, itemFromText, moveItem, removeItem } from './schedule'

describe('item builders', () => {
  it('builds a song item with one slide per section', () => {
    const item = itemFromSong('Test song', 'A\nB\n\n[Chorus]\nC\nD')
    expect(item.type).toBe('song')
    expect(item.status).toBe('ready')
    expect(item.slides.map((s) => s.label)).toEqual(['Verse 1', 'Chorus'])
    expect(item.slides.every((s) => s.id.startsWith(item.id))).toBe(true)
  })

  it('builds a scripture item with one slide per verse', () => {
    const result = lookupPassage({ book: 'Romans', chapter: 8, verseStart: 35, verseEnd: 37 })
    expect(result).not.toBeNull()
    const item = itemFromScripture(result!)
    expect(item.type).toBe('scripture')
    expect(item.title).toBe('Romans 8:35–37')
    expect(item.slides.map((s) => s.label)).toEqual(['8:35', '8:36', '8:37'])
    expect(item.slides[0].kind).toBe('scripture')
    expect(item.slides[0].reference).toBe('Romans 8:35 (KJV)')
  })

  it('builds a text item', () => {
    const item = itemFromText('offering', 'Offering', ['Give by M-Pesa'])
    expect(item.slides).toHaveLength(1)
    expect(item.slides[0].lines).toEqual(['Give by M-Pesa'])
    expect(itemFromText('video', 'Clip', ['Clip'], 'missing').status).toBe('missing')
  })
})

describe('schedule helpers', () => {
  const a = itemFromText('announcement', 'A', ['a'])
  const b = itemFromText('announcement', 'B', ['b'])
  const c = itemFromText('announcement', 'C', ['c'])

  it('adds to the end', () => {
    expect(addItem([a, b], c).map((i) => i.title)).toEqual(['A', 'B', 'C'])
  })

  it('removes by id', () => {
    expect(removeItem([a, b, c], b.id).map((i) => i.title)).toEqual(['A', 'C'])
    expect(removeItem([a], 'missing')).toEqual([a])
  })

  it('moves an item and clamps at the ends', () => {
    expect(moveItem([a, b, c], b.id, 1).map((i) => i.title)).toEqual(['A', 'C', 'B'])
    expect(moveItem([a, b, c], b.id, -5).map((i) => i.title)).toEqual(['B', 'A', 'C'])
    const same = [a, b, c]
    expect(moveItem(same, c.id, 1)).toBe(same)
    expect(moveItem(same, 'nope', 1)).toBe(same)
  })
})

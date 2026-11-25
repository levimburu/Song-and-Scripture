import { describe, expect, it } from 'vitest'
import { itemFromSong, itemFromText } from './schedule'
import { isScheduleItem, isScheduleItems, isSlide } from './validate'

describe('validate', () => {
  it('accepts items built by the app', () => {
    const items = [itemFromSong('Song', 'A\nB'), itemFromText('offering', 'Offering', ['Give'])]
    expect(isScheduleItems(items)).toBe(true)
  })

  it('accepts an empty schedule', () => {
    expect(isScheduleItems([])).toBe(true)
  })

  it('rejects things that are not schedules', () => {
    expect(isScheduleItems(null)).toBe(false)
    expect(isScheduleItems({})).toBe(false)
    expect(isScheduleItems('text')).toBe(false)
    expect(isScheduleItems([1, 2])).toBe(false)
  })

  it('rejects items with a bad type, status or slides', () => {
    const good = itemFromText('offering', 'Offering', ['Give'])
    expect(isScheduleItem({ ...good, type: 'nonsense' })).toBe(false)
    expect(isScheduleItem({ ...good, status: 'broken' })).toBe(false)
    expect(isScheduleItem({ ...good, slides: [{ id: 1 }] })).toBe(false)
    expect(isScheduleItem({ ...good, title: 5 })).toBe(false)
  })

  it('checks slide lines are strings', () => {
    const slide = { id: 'a', kind: 'verse', label: 'Verse 1', lines: ['one', 'two'] }
    expect(isSlide(slide)).toBe(true)
    expect(isSlide({ ...slide, lines: ['one', 2] })).toBe(false)
    expect(isSlide({ ...slide, kind: 'weird' })).toBe(false)
  })
})

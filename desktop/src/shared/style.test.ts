import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE, FONTS, MAX_TEXT, sanitizeStyle } from './style'

describe('display style', () => {
  it('fills in everything from nothing', () => {
    expect(sanitizeStyle(undefined)).toEqual(DEFAULT_STYLE)
    expect(sanitizeStyle('rubbish')).toEqual(DEFAULT_STYLE)
  })
  it('keeps good values and repairs bad ones', () => {
    const s = sanitizeStyle({
      songs: { font: 'Oswald', color: '#FF0000', maxSize: 9999, align: 'sideways' },
      scripture: { font: 'Comic Sans; background:url(x)', color: 'red' },
      reference: { position: 'top', show: false, size: 3 }
    })
    expect(s.songs.font).toBe('Oswald')
    expect(s.songs.color).toBe('#ff0000')
    expect(s.songs.maxSize).toBe(MAX_TEXT)
    expect(s.songs.align).toBe('center')
    expect(s.scripture.font).toBe(DEFAULT_STYLE.scripture.font)
    expect(s.scripture.color).toBeNull()
    expect(s.reference).toMatchObject({ position: 'top', show: false, size: 20 })
  })
  it('only allows bundled fonts', () => {
    expect(FONTS.length).toBeGreaterThan(10)
    expect(DEFAULT_STYLE.songs.font && FONTS.some((f) => f.family === DEFAULT_STYLE.songs.font)).toBe(true)
    expect(FONTS.some((f) => f.family === DEFAULT_STYLE.scripture.font)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { splitLyrics } from './lyrics'

const opts = { idPrefix: 't' }

describe('splitLyrics', () => {
  it('returns no slides for empty input', () => {
    expect(splitLyrics('', opts)).toEqual([])
    expect(splitLyrics('  \n \n\n', opts)).toEqual([])
  })

  it('turns blank-line separated blocks into numbered verses', () => {
    const slides = splitLyrics('Line one\nLine two\n\nLine three\nLine four', opts)
    expect(slides.map((s) => s.label)).toEqual(['Verse 1', 'Verse 2'])
    expect(slides.map((s) => s.kind)).toEqual(['verse', 'verse'])
    expect(slides[0].lines).toEqual(['Line one', 'Line two'])
    expect(slides.map((s) => s.id)).toEqual(['t-1', 't-2'])
  })

  it('reads section headers in brackets or plain', () => {
    const text = '[Verse 1]\nA\nB\n\nChorus\nC\nD\n\n[Bridge]\nE\nF'
    const slides = splitLyrics(text, opts)
    expect(slides.map((s) => [s.kind, s.label])).toEqual([
      ['verse', 'Verse 1'],
      ['chorus', 'Chorus'],
      ['bridge', 'Bridge']
    ])
    expect(slides[1].lines).toEqual(['C', 'D'])
  })

  it('keeps verse numbering going after a chorus', () => {
    const text = 'A\nB\n\n[Chorus]\nC\nD\n\nE\nF'
    const slides = splitLyrics(text, opts)
    expect(slides.map((s) => s.label)).toEqual(['Verse 1', 'Chorus', 'Verse 2'])
  })

  it('honours explicit verse numbers', () => {
    const slides = splitLyrics('[Verse 3]\nA\nB\n\nC\nD', opts)
    expect(slides.map((s) => s.label)).toEqual(['Verse 3', 'Verse 4'])
  })

  it('applies a header that sits alone above the next block', () => {
    const slides = splitLyrics('Chorus\n\nC\nD', opts)
    expect(slides).toHaveLength(1)
    expect(slides[0].kind).toBe('chorus')
    expect(slides[0].lines).toEqual(['C', 'D'])
  })

  it('splits a long block into even parts', () => {
    const lines = ['1', '2', '3', '4', '5', '6']
    const slides = splitLyrics(lines.join('\n'), { ...opts, maxLines: 4 })
    expect(slides).toHaveLength(2)
    expect(slides[0].lines).toEqual(['1', '2', '3'])
    expect(slides[1].lines).toEqual(['4', '5', '6'])
    expect(slides.map((s) => s.label)).toEqual(['Verse 1 (1)', 'Verse 1 (2)'])
  })

  it('handles Windows line endings and trailing spaces', () => {
    const slides = splitLyrics('One  \r\nTwo\r\n\r\nThree', opts)
    expect(slides).toHaveLength(2)
    expect(slides[0].lines).toEqual(['One', 'Two'])
  })

  it('maps other section names to bridge-style sections', () => {
    const slides = splitLyrics('[Pre-chorus]\nA\n\n[Intro]\nB\n\nrefrain\nC', opts)
    expect(slides.map((s) => [s.kind, s.label])).toEqual([
      ['bridge', 'Pre-chorus'],
      ['bridge', 'Intro'],
      ['chorus', 'Chorus']
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { applyColour, applyScale, clearFormatting, parseRuns, stripMarkup } from './markup'

describe('text markup', () => {
  it('reads colour and size', () => {
    expect(parseRuns('Hello [c=#ff0000]red[/c] [s=1.5]big[/s]!')).toEqual([
      { text: 'Hello ' },
      { text: 'red', color: '#ff0000' },
      { text: ' ' },
      { text: 'big', scale: 1.5 },
      { text: '!' }
    ])
  })

  it('combines nested sizes and colours', () => {
    expect(parseRuns('[s=1.2][s=1.5][c=#00ff00]x[/c][/s][/s]')).toEqual([{ text: 'x', color: '#00ff00', scale: 1.2 * 1.5 }])
  })

  it('leaves unclear tags as plain text and ignores stray closers', () => {
    expect(parseRuns('[c=red]no[/c]')).toEqual([{ text: '[c=red]no' }])
    expect(parseRuns('[s=9]huge[/s]')).toEqual([{ text: '[s=9]huge' }])
    expect(parseRuns('[Chorus] stays')).toEqual([{ text: '[Chorus] stays' }])
    expect(parseRuns('')).toEqual([{ text: '' }])
  })

  it('strips tags for lists and search', () => {
    expect(stripMarkup('A [c=#ff0000]b[/c] [s=1.25]c[/s]')).toBe('A b c')
  })

  it('wraps each selected line separately so screens stay self-contained', () => {
    const text = 'one\ntwo\n\nthree'
    const edit = applyColour(text, 0, text.length, '#FF0000')
    expect(edit.text).toBe('[c=#ff0000]one[/c]\n[c=#ff0000]two[/c]\n\n[c=#ff0000]three[/c]')
  })

  it('nests when applied again to the same words and clears them', () => {
    const first = applyScale('big', 0, 3, 1.25)
    expect(first.text).toBe('[s=1.25]big[/s]')
    const second = applyScale(first.text, first.start, first.end, 1.25)
    expect(second.text).toBe('[s=1.25][s=1.25]big[/s][/s]')
    expect(clearFormatting(second.text, second.start, second.end).text).toBe('big')
  })

  it('does nothing for an empty selection or a bad value', () => {
    expect(applyColour('abc', 1, 1, '#ff0000').text).toBe('abc')
    expect(applyColour('abc', 0, 3, 'red').text).toBe('abc')
    expect(applyScale('abc', 0, 3, 10).text).toBe('abc')
  })
})

import { describe, expect, it } from 'vitest'
import { applyColour, applyScale, clearFormatting, parseRuns, stripMarkup, tagsFor } from './markup'

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
    expect(parseRuns("[c=red]no[/c]")).toEqual([{ text: "[c=red]no" }])
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

describe('bold, italic, underline, strike and highlight', () => {
  it('reads them and writes the same tags back', () => {
    const runs = parseRuns('[b][i]a[/i][/b] [nb][u][x]b[/x][/u][/nb][h=#ffff00]c[/h]')
    expect(runs[0]).toEqual({ text: 'a', bold: true, italic: true })
    expect(runs[2]).toEqual({ text: 'b', bold: false, underline: true, strike: true })
    expect(runs[3]).toEqual({ text: 'c', highlight: '#ffff00' })
    const tags = tagsFor({ bold: true, italic: true })
    expect(tags).toEqual({ open: '[b][i]', close: '[/i][/b]' })
    expect(stripMarkup('[b]a[/b][nb]b[/nb][u]c[/u][h=#ffff00]d[/h]')).toBe('abcd')
  })
})

describe('font and outline', () => {
  it('reads a known font and outline, and ignores an unknown font', () => {
    const runs = parseRuns('[f=Inter]a[/f][o]b[/o]')
    expect(runs[0]).toEqual({ text: 'a', font: 'Inter' })
    expect(runs[1]).toEqual({ text: 'b', outline: true })
    expect(parseRuns('[f=Nope]x')[0].font).toBeUndefined()
    expect(tagsFor({ outline: true, font: 'Inter' }).open).toContain('[o]')
  })
})

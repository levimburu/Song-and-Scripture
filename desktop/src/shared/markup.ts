import { FONTS } from './style'

/**
 * Colour and size for part of a line of text. The editor adds these small tags around the selected words:
 *   [c=#ff0000]red words[/c]     [s=1.25]bigger words[/s]
 * Sizes are relative to the size the screen picks to fit the text, so 1.25 is a quarter bigger.
 */
export interface Run {
  text: string
  color?: string
  highlight?: string
  scale?: number
  /** true = bold, false = not bold although the screen's text style is bold, undefined = as the style says. */
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  outline?: boolean
  font?: string
}

const TAG = /\[(?:c=(#[0-9a-fA-F]{6})|h=(#[0-9a-fA-F]{6})|s=(\d(?:\.\d{1,2})?)|f=([A-Za-z0-9 ]{1,40})|\/c|\/h|\/s|\/f|b|nb|i|u|x|o|\/b|\/nb|\/i|\/u|\/x|\/o)\]/g
export const MIN_SCALE = 0.3
export const MAX_SCALE = 3

/** Splits one line into pieces that each have their own look. Anything unclear is left as plain text. */
export function parseRuns(line: string): Run[] {
  const runs: Run[] = []
  const colours: string[] = []
  const marks: string[] = []
  const scales: number[] = []
  const weights: boolean[] = []
  let italic = 0
  let underline = 0
  let strike = 0
  let outline = 0
  const fonts: string[] = []
  let last = 0
  const push = (text: string): void => {
    if (text === '') return
    const scale = scales.reduce((a, b) => a * b, 1)
    runs.push({
      text,
      ...(colours.length ? { color: colours[colours.length - 1] } : {}),
      ...(marks.length ? { highlight: marks[marks.length - 1] } : {}),
      ...(scale !== 1 ? { scale } : {}),
      ...(weights.length ? { bold: weights[weights.length - 1] } : {}),
      ...(italic > 0 ? { italic: true } : {}),
      ...(underline > 0 ? { underline: true } : {}),
      ...(strike > 0 ? { strike: true } : {}),
      ...(outline > 0 ? { outline: true } : {}),
      ...(fonts.length ? { font: fonts[fonts.length - 1] } : {})
    })
  }
  for (const match of line.matchAll(TAG)) {
    const at = match.index ?? 0
    const token = match[0]
    if (token.startsWith('[s=')) {
      const value = Number(match[3])
      if (!(value >= MIN_SCALE && value <= MAX_SCALE)) continue
    }
    if (match[4] !== undefined && !FONTS.some((f) => f.family === match[4])) continue
    push(line.slice(last, at))
    last = at + token.length
    if (match[1]) colours.push(match[1])
    else if (match[2]) marks.push(match[2])
    else if (match[3]) scales.push(Number(match[3]))
    else if (token === '[/c]') colours.pop()
    else if (token === '[/h]') marks.pop()
    else if (token === '[/s]') scales.pop()
    else if (token === '[b]') weights.push(true)
    else if (token === '[nb]') weights.push(false)
    else if (token === '[/b]' || token === '[/nb]') weights.pop()
    else if (token === '[i]') italic++
    else if (token === '[/i]') italic = Math.max(0, italic - 1)
    else if (token === '[u]') underline++
    else if (token === '[/u]') underline = Math.max(0, underline - 1)
    else if (token === '[x]') strike++
    else if (token === '[/x]') strike = Math.max(0, strike - 1)
    else if (token === '[o]') outline++
    else if (token === '[/o]') outline = Math.max(0, outline - 1)
    else if (match[4]) fonts.push(match[4])
    else if (token === '[/f]') fonts.pop()
  }
  push(line.slice(last))
  return runs.length > 0 ? runs : [{ text: '' }]
}

/** The words without the tags, for lists and searching. */
export function stripMarkup(text: string): string {
  return text.replace(TAG, '')
}

/** The tags that wrap a run, for writing the text back out. Closing tags come back in the opposite order. */
export function tagsFor(run: Omit<Run, 'text'>): { open: string; close: string } {
  const pairs: [string, string][] = []
  if (run.bold === true) pairs.push(['[b]', '[/b]'])
  if (run.bold === false) pairs.push(['[nb]', '[/nb]'])
  if (run.italic) pairs.push(['[i]', '[/i]'])
  if (run.underline) pairs.push(['[u]', '[/u]'])
  if (run.strike) pairs.push(['[x]', '[/x]'])
  if (run.outline) pairs.push(['[o]', '[/o]'])
  if (run.font) pairs.push([`[f=${run.font}]`, '[/f]'])
  if (run.color) pairs.push([`[c=${run.color.toLowerCase()}]`, '[/c]'])
  if (run.highlight) pairs.push([`[h=${run.highlight.toLowerCase()}]`, '[/h]'])
  if (run.scale && run.scale !== 1) pairs.push([`[s=${Math.round(run.scale * 100) / 100}]`, '[/s]'])
  return { open: pairs.map((p) => p[0]).join(''), close: pairs.map((p) => p[1]).reverse().join('') }
}

export interface Edit {
  text: string
  start: number
  end: number
}

function wrapLines(text: string, start: number, end: number, open: string, close: string): Edit {
  if (start >= end) return { text, start, end }
  const middle = text
    .slice(start, end)
    .split('\n')
    .map((piece) => (piece.trim() === '' ? piece : `${open}${piece}${close}`))
    .join('\n')
  return { text: text.slice(0, start) + middle + text.slice(end), start, end: start + middle.length }
}

const HEX = /^#[0-9a-fA-F]{6}$/

export function applyColour(text: string, start: number, end: number, hex: string): Edit {
  return HEX.test(hex) ? wrapLines(text, start, end, `[c=${hex.toLowerCase()}]`, '[/c]') : { text, start, end }
}

export function applyScale(text: string, start: number, end: number, factor: number): Edit {
  const f = Math.round(factor * 100) / 100
  return f >= MIN_SCALE && f <= MAX_SCALE ? wrapLines(text, start, end, `[s=${f}]`, '[/s]') : { text, start, end }
}

/** Takes colour and size off the selected words. */
export function clearFormatting(text: string, start: number, end: number): Edit {
  const cleaned = stripMarkup(text.slice(start, end))
  return { text: text.slice(0, start) + cleaned + text.slice(end), start, end: start + cleaned.length }
}

/** Takes only the colour off the selected words, keeping their size. */
export function clearColour(text: string, start: number, end: number): Edit {
  const cleaned = text.slice(start, end).replace(/\[c=#[0-9a-fA-F]{6}\]|\[\/c\]/g, '')
  return { text: text.slice(0, start) + cleaned + text.slice(end), start, end: start + cleaned.length }
}

/**
 * Colour and size for part of a line of text. The editor adds these small tags around the selected words:
 *   [c=#ff0000]red words[/c]     [s=1.25]bigger words[/s]
 * Sizes are relative to the size the screen picks to fit the text, so 1.25 is a quarter bigger.
 */
export interface Run {
  text: string
  color?: string
  scale?: number
}

const TAG = /\[(?:c=(#[0-9a-fA-F]{6})|s=(\d(?:\.\d{1,2})?)|\/c|\/s)\]/g
export const MIN_SCALE = 0.3
export const MAX_SCALE = 3

/** Splits one line into pieces that each have one colour and one size. Anything unclear is left as plain text. */
export function parseRuns(line: string): Run[] {
  const runs: Run[] = []
  const colours: string[] = []
  const scales: number[] = []
  let last = 0
  const push = (text: string): void => {
    if (text === '') return
    const scale = scales.reduce((a, b) => a * b, 1)
    runs.push({ text, ...(colours.length ? { color: colours[colours.length - 1] } : {}), ...(scale !== 1 ? { scale } : {}) })
  }
  for (const match of line.matchAll(TAG)) {
    const at = match.index ?? 0
    const token = match[0]
    if (token.startsWith('[s=')) {
      const value = Number(match[2])
      if (!(value >= MIN_SCALE && value <= MAX_SCALE)) continue
    }
    push(line.slice(last, at))
    last = at + token.length
    if (match[1]) colours.push(match[1])
    else if (match[2]) scales.push(Number(match[2]))
    else if (token === '[/c]') colours.pop()
    else if (token === '[/s]') scales.pop()
  }
  push(line.slice(last))
  return runs.length > 0 ? runs : [{ text: '' }]
}

/** The words without the tags, for lists and searching. */
export function stripMarkup(text: string): string {
  return text.replace(TAG, '')
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

import { parseRuns, tagsFor, type Run } from '../../shared/markup'
import { FONTS } from '../../shared/style'

/** Fills the editing box from the saved text, one <div> per line. */
export function markupToDom(markup: string, root: HTMLElement): void {
  root.textContent = ''
  for (const line of markup.split('\n')) {
    const div = document.createElement('div')
    const runs = parseRuns(line)
    if (runs.length === 1 && runs[0].text === '') {
      div.appendChild(document.createElement('br'))
    } else {
      for (const run of runs) {
        const span = document.createElement('span')
        span.textContent = run.text
        if (run.bold !== undefined) span.style.fontWeight = run.bold ? '700' : '400'
        if (run.italic) span.style.fontStyle = 'italic'
        const lines = [run.underline ? 'underline' : '', run.strike ? 'line-through' : ''].filter(Boolean).join(' ')
        if (lines) span.style.textDecoration = lines
        if (run.color) span.style.color = run.color
        if (run.font) span.style.fontFamily = `'${run.font}'`
        if (run.outline) {
          span.dataset.o = '1'
          span.style.setProperty('-webkit-text-stroke', '0.04em #000')
          span.style.setProperty('paint-order', 'stroke fill')
        }
        if (run.highlight) span.style.backgroundColor = run.highlight
        if (run.scale) {
          span.dataset.s = String(run.scale)
          span.style.fontSize = `${run.scale}em`
        }
        div.appendChild(span)
      }
    }
    root.appendChild(div)
  }
}

interface Look {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  color?: string
  highlight?: string
  scale: number
  outline: boolean
  font?: string
}

const BLOCKS = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3'])

function hex(css: string): string | undefined {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(css)
  if (!m) return undefined
  if (m[4] !== undefined && Number(m[4]) === 0) return undefined
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}

function firstFamily(css: string): string {
  return css.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? ''
}

function lookOf(node: Node, root: HTMLElement): Look {
  const baseColour = hex(getComputedStyle(root).color)
  const parent = node.parentElement ?? root
  const own = getComputedStyle(parent)
  const look: Look = {
    bold: parseInt(own.fontWeight, 10) >= 600,
    italic: own.fontStyle === 'italic',
    underline: false,
    strike: false,
    scale: 1,
    outline: false
  }
  const baseFont = firstFamily(getComputedStyle(root).fontFamily)
  const family = firstFamily(own.fontFamily)
  if (family && family !== baseFont && FONTS.some((f) => f.family === family)) look.font = family
  const colour = hex(own.color)
  if (colour && colour !== baseColour) look.color = colour
  for (let el: HTMLElement | null = parent; el && el !== root; el = el.parentElement) {
    const cs = getComputedStyle(el)
    if (cs.textDecorationLine.includes('underline')) look.underline = true
    if (cs.textDecorationLine.includes('line-through')) look.strike = true
    if (!look.highlight) look.highlight = hex(cs.backgroundColor)
    if (el.dataset.s) look.scale *= Number(el.dataset.s) || 1
    if (el.dataset.o) look.outline = true
  }
  return look
}

/** Walks the lines of the editing box. With a root it also reads each piece's look. */
function walkLines(node: Node, root: HTMLElement | null): { text: string; look?: Look }[][] {
  const lines: { text: string; look?: Look }[][] = []
  let current: { text: string; look?: Look }[] = []
  const flush = (): void => {
    lines.push(current)
    current = []
  }
  const walk = (n: Node): void => {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = (n.textContent ?? '').replace(/​/g, '')
      if (text !== '') current.push({ text, look: root ? lookOf(n, root) : undefined })
    } else if (n instanceof HTMLElement) {
      if (n.tagName === 'BR') {
        flush()
      } else if (BLOCKS.has(n.tagName)) {
        if (current.length > 0) flush()
        const before = lines.length
        n.childNodes.forEach(walk)
        if (current.length > 0) flush()
        else if (lines.length === before) flush()
      } else {
        n.childNodes.forEach(walk)
      }
    } else {
      n.childNodes.forEach(walk)
    }
  }
  node.childNodes.forEach(walk)
  if (current.length > 0) flush()
  return lines
}

/** Turns the editing box back into the saved text with its tags. */
export function domToMarkup(root: HTMLElement): string {
  const baseBold = parseInt(getComputedStyle(root).fontWeight, 10) >= 600
  return walkLines(root, root)
    .map((line) => {
      const runs: Run[] = line.map((piece) => {
        const l = piece.look as Look
        return {
          text: piece.text,
          ...(l.bold !== baseBold ? { bold: l.bold } : {}),
          ...(l.italic ? { italic: true } : {}),
          ...(l.underline ? { underline: true } : {}),
          ...(l.strike ? { strike: true } : {}),
          ...(l.outline ? { outline: true } : {}),
          ...(l.font ? { font: l.font } : {}),
          ...(l.color ? { color: l.color } : {}),
          ...(l.highlight ? { highlight: l.highlight } : {}),
          ...(l.scale !== 1 ? { scale: Math.round(l.scale * 100) / 100 } : {})
        }
      })
      // Join neighbours that look the same so the text carries as few tags as possible.
      const merged: Run[] = []
      for (const run of runs) {
        const { text, ...style } = run
        const prev = merged[merged.length - 1]
        if (prev && tagsFor(prev).open === tagsFor(style).open) prev.text += text
        else merged.push({ ...run })
      }
      return merged
        .map((run) => {
          const { text, ...style } = run
          const t = tagsFor(style)
          return `${t.open}${text}${t.close}`
        })
        .join('')
    })
    .join('\n')
}

/** The lines of text from the start of the box up to the cursor, for showing the screen the cursor is in. */
export function textUpToCaret(root: HTMLElement): string | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.focusNode)) return null
  const range = document.createRange()
  range.selectNodeContents(root)
  range.setEnd(sel.focusNode as Node, sel.focusOffset)
  const holder = document.createElement('div')
  holder.appendChild(range.cloneContents())
  return walkLines(holder, null)
    .map((line) => line.map((p) => p.text).join(''))
    .join('\n')
}

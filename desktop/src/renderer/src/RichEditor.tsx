import { IconBold, IconItalic, IconStrikethrough, IconUnderline } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { FONTS } from '../../shared/style'
import { MAX_SCALE, MIN_SCALE } from '../../shared/markup'
import { markupToDom, domToMarkup, textUpToCaret } from './richText'
import { ColourPick } from './Themes'

interface Props {
  /** The saved text with its tags. Read once, when the box opens. */
  initial: string
  onChange: (markup: string) => void
  onCaret: (textUpToCaret: string) => void
  /** How the box looks, so it matches the screen: the font and whether the text is bold by default. */
  font: string
  bold: boolean
  label: string
  placeholder: string
}

const COMMANDS = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' } as const
type Mark = keyof typeof COMMANDS | 'outline'

function family(css: string): string {
  return css.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? ''
}

/** A box where the text looks the way it will on the screen, with the same tools as a word processor. */
export function RichEditor({ initial, onChange, onCaret, font, bold, label, placeholder }: Props): React.JSX.Element {
  const box = useRef<HTMLDivElement>(null)
  const saved = useRef<Range | null>(null)
  const [on, setOn] = useState<Record<Mark, boolean>>({ bold: false, italic: false, underline: false, strike: false, outline: false })
  const [fontNow, setFontNow] = useState(font)
  const [sizeNow, setSizeNow] = useState(100)
  const [colour, setColour] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [hint, setHint] = useState(false)
  const [empty, setEmpty] = useState(initial.trim() === '')

  useEffect(() => {
    if (box.current) markupToDom(initial, box.current)
    // The box is filled once; after that the browser owns what is typed in it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onSelection = (): void => {
      const el = box.current
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return
      saved.current = sel.getRangeAt(0).cloneRange()
      const here = sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode?.parentElement
      let scale = 1
      for (let n: HTMLElement | null = here ?? null; n && n !== el; n = n.parentElement) if (n.dataset.s) scale *= Number(n.dataset.s) || 1
      setSizeNow(Math.round(scale * 100))
      setFontNow(family(getComputedStyle(here ?? el).fontFamily) || font)
      setOn({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        outline: !!here?.closest('[data-o]')
      })
      const up = textUpToCaret(el)
      if (up !== null) onCaret(up)
    }
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [onCaret, font])

  function changed(): void {
    const el = box.current
    if (!el) return
    setEmpty((el.textContent ?? '') === '' && el.querySelectorAll('div').length <= 1)
    onChange(domToMarkup(el))
  }

  /** Puts the selection back (a button may have taken it). Returns it, or null when nothing is selected and words are needed. */
  function selected(needWords: boolean): Range | null {
    const el = box.current
    if (!el) return null
    el.focus()
    const sel = window.getSelection()
    if (saved.current && sel) {
      sel.removeAllRanges()
      sel.addRange(saved.current)
    }
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
    if (!range) return null
    if (needWords && range.collapsed) {
      setHint(true)
      return null
    }
    setHint(false)
    return range
  }

  function run(command: string, value?: string): void {
    if (!selected(false)) return
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
    changed()
  }

  function scaleAbove(node: Node | null): number {
    const el = box.current
    let scale = 1
    for (let n: HTMLElement | null = node instanceof HTMLElement ? node : (node?.parentElement ?? null); n && n !== el; n = n.parentElement) {
      if (n.dataset.s) scale *= Number(n.dataset.s) || 1
    }
    return scale
  }

  function selectContents(node: Node): void {
    const sel = window.getSelection()
    const after = document.createRange()
    after.selectNodeContents(node)
    sel?.removeAllRanges()
    sel?.addRange(after)
  }

  function setSize(percent: number): void {
    const range = selected(true)
    if (!range || !box.current) return
    const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, percent / 100))
    // Sizes inside the selection are replaced, not stacked.
    const inside = Array.from(box.current.querySelectorAll<HTMLElement>('span[data-s]')).filter((s) => range.intersectsNode(s) && range.comparePoint(s, 0) >= 0)
    for (const s of inside) s.replaceWith(...Array.from(s.childNodes))
    const factor = Math.round((target / scaleAbove(range.commonAncestorContainer)) * 100) / 100
    if (factor === 1) {
      changed()
      return
    }
    const span = document.createElement('span')
    span.dataset.s = String(factor)
    span.style.fontSize = `${factor}em`
    span.appendChild(range.extractContents())
    range.insertNode(span)
    selectContents(span)
    changed()
  }

  function toggleOutline(): void {
    const range = selected(true)
    if (!range || !box.current) return
    const spans = Array.from(box.current.querySelectorAll<HTMLElement>('span[data-o]')).filter((s) => range.intersectsNode(s))
    if (spans.length > 0) {
      for (const s of spans) s.replaceWith(...Array.from(s.childNodes))
    } else {
      const span = document.createElement('span')
      span.dataset.o = '1'
      span.style.setProperty('-webkit-text-stroke', '0.04em #000')
      span.style.setProperty('paint-order', 'stroke fill')
      span.appendChild(range.extractContents())
      range.insertNode(span)
      selectContents(span)
    }
    changed()
  }

  function reset(): void {
    const el = box.current
    if (!el) return
    const range = selected(false)
    if (!range || range.collapsed) {
      // Nothing selected: everything goes back to plain text.
      markupToDom((domToMarkup(el).replace(/\[\/?(?:c|h|s|f|b|nb|i|u|x|o)(?:=[^\]]*)?\]/g, '')), el)
    } else {
      document.execCommand('removeFormat')
      el.querySelectorAll<HTMLElement>('span[data-s], span[data-o]').forEach((s) => {
        if (range.intersectsNode(s)) s.replaceWith(...Array.from(s.childNodes))
      })
    }
    changed()
  }

  const mark = (m: keyof typeof COMMANDS, icon: React.JSX.Element, title: string): React.JSX.Element => (
    <button className={`btn small fmt${on[m] ? ' on' : ''}`} aria-pressed={on[m]} aria-label={title} title={title} onMouseDown={(e) => e.preventDefault()} onClick={() => run(COMMANDS[m])}>
      {icon}
    </button>
  )

  return (
    <div className="rich">
      <div className="format-bar" role="toolbar" aria-label="Text formatting">
        <select className="fmt-font" value={fontNow} aria-label="Font" onChange={(e) => run('fontName', e.target.value)}>
          {FONTS.map((f) => (
            <option key={f.family} value={f.family}>
              {f.family === font ? `Default (${f.family})` : f.family}
            </option>
          ))}
        </select>
        <input
          className="fmt-size"
          type="number"
          min={Math.round(MIN_SCALE * 100)}
          max={Math.round(MAX_SCALE * 100)}
          step={10}
          value={sizeNow}
          aria-label="Size in percent"
          title="Size of the selected words, in percent of the normal size"
          onChange={(e) => {
            const v = Number(e.target.value)
            setSizeNow(v)
            if (v >= MIN_SCALE * 100 && v <= MAX_SCALE * 100) setSize(v)
          }}
        />
        {mark('bold', <IconBold size={15} />, 'Bold')}
        {mark('italic', <IconItalic size={15} />, 'Italic')}
        {mark('underline', <IconUnderline size={15} />, 'Underline')}
        {mark('strike', <IconStrikethrough size={15} />, 'Strike through')}
        <button className={`btn small fmt${on.outline ? ' on' : ''}`} aria-pressed={on.outline} aria-label="Outline" title="Outline" onMouseDown={(e) => e.preventDefault()} onClick={toggleOutline}>
          <span className="fmt-o">O</span>
        </button>
        <ColourPick label="Text colour" caption="Text" value={colour} onChange={(c) => { setColour(c); if (c) run('foreColor', c) }} />
        <ColourPick label="Background" caption="Background" value={highlight} onChange={(c) => { setHighlight(c); if (c) run('hiliteColor', c) }} />
        <span className="fmt-spacer" />
        <button className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={reset} title="Take colour, size and style off the selected words, or off everything if nothing is selected">
          Reset Attributes
        </button>
      </div>
      {hint && <span className="unsaved">Select the words first.</span>}
      <div className="rich-wrap">
        <div
          ref={box}
          className="rich-box"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          spellCheck={false}
          style={{ fontFamily: `'${font}', system-ui, sans-serif`, fontWeight: bold ? 700 : 400 }}
          onInput={changed}
          onPaste={(e) => {
            // Keep only the words, so pasted text brings no stray fonts or colours.
            e.preventDefault()
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
          }}
        />
        {empty && <div className="rich-placeholder" aria-hidden="true">{placeholder}</div>}
      </div>
    </div>
  )
}

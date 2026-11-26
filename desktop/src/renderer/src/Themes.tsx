import { IconRestore } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_STYLE,
  FONTS,
  MAX_REF,
  MAX_TEXT,
  MIN_REF,
  MIN_TEXT,
  type DisplayStyle,
  type HAlign,
  type ReferenceStyle,
  type TextStyle,
  type VAlign
} from '../../shared/style'
import type { OutputState, Slide } from '../../shared/types'
import { SlideView } from './SlideView'

interface Props {
  /** The saved style, the one the screens use. */
  style: DisplayStyle
  onSave: (style: DisplayStyle) => void
  /** Builds the preview screen (theme and background) around a sample slide and the style being edited. */
  preview: (slide: Slide, style: DisplayStyle) => OutputState
}

const SAMPLE_SONG: Slide = { id: 's', kind: 'verse', label: 'Verse 1', lines: ['Amazing grace! How sweet the sound', 'That saved a wretch like me!'] }
const SAMPLE_VERSE: Slide = {
  id: 'v',
  kind: 'scripture',
  label: '3:16',
  lines: ['For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'],
  reference: 'John 3:16 (KJV)'
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }): React.JSX.Element {
  return (
    <span className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} className={v === value ? 'active' : ''} onClick={() => onChange(v)} aria-pressed={v === value}>
          {text}
        </button>
      ))}
    </span>
  )
}

function FontSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }): React.JSX.Element {
  return (
    <select className="mini wide" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {(['Sans-serif', 'Serif'] as const).map((group) => (
        <optgroup key={group} label={group}>
          {FONTS.filter((f) => f.group === group).map((f) => (
            <option key={f.family} value={f.family} style={{ fontFamily: `'${f.family}'` }}>
              {f.family}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

const THEME_BASE = ['#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47']
const STANDARD = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0']

function mix(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (target - c) * amount))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// Like Word: the main colours on top, then lighter and darker shades of each, then the standard colours.
const SHADES: string[][] = [
  THEME_BASE,
  ...[0.8, 0.6, 0.4].map((a) => THEME_BASE.map((c) => mix(c, 255, a))),
  ...[0.25, 0.5].map((a) => THEME_BASE.map((c) => mix(c, 0, a)))
]

export function ColourPick({ value, onChange, label, caption }: { value: string | null; onChange: (v: string | null) => void; label: string; caption?: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event): void => {
      if (e.target instanceof Node && (panel.current?.contains(e.target) || button.current?.contains(e.target))) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', key, true)
    }
  }, [open])

  function toggle(): void {
    const r = button.current?.getBoundingClientRect()
    if (r) {
      // Open upwards when there is no room below, so the palette is never cut off.
      const height = 330
      setPos({ left: Math.min(r.left, window.innerWidth - 270), top: r.bottom + height > window.innerHeight ? Math.max(8, r.top - height - 4) : r.bottom + 4 })
    }
    setOpen((v) => !v)
  }

  const pick = (c: string | null): void => {
    onChange(c)
    setOpen(false)
  }
  const Swatch = ({ c }: { c: string }): React.JSX.Element => (
    <button className={`swatch${value === c ? ' chosen' : ''}`} style={{ background: c }} onClick={() => pick(c)} aria-label={`${label} ${c}`} title={c} />
  )

  return (
    <span className="colour-pick">
      <button ref={button} className="btn small colour-btn" onClick={toggle} aria-label={label} aria-expanded={open}>
        <span className="swatch-current" style={{ background: value ?? 'transparent' }}>
          {value === null && <span className="auto-mark">A</span>}
        </span>
        {caption ?? (value === null ? 'Automatic' : value.toUpperCase())}
      </button>
      {open && (
        <div ref={panel} className="palette" style={{ left: pos.left, top: pos.top }} role="dialog" aria-label={`${label} palette`}>
          <button className={`palette-auto${value === null ? ' chosen' : ''}`} onClick={() => pick(null)}>Automatic</button>
          <div className="palette-title">Theme colours</div>
          <div className="palette-grid">
            {SHADES.flat().map((c, i) => (
              <Swatch key={`${c}${i}`} c={c} />
            ))}
          </div>
          <div className="palette-title">Standard colours</div>
          <div className="palette-grid">
            {STANDARD.map((c) => (
              <Swatch key={c} c={c} />
            ))}
          </div>
          <label className="palette-more">
            More colours…
            <input type="color" value={value ?? '#ffffff'} onChange={(e) => onChange(e.target.value)} aria-label={`${label} custom`} />
          </label>
        </div>
      )}
    </span>
  )
}

const H_OPTIONS: [HAlign, string][] = [['left', 'Left'], ['center', 'Center'], ['right', 'Right']]
const V_OPTIONS: [VAlign, string][] = [['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']]

function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="style-row">
      <span className="style-label">{label}</span>
      <span className="style-control">{children}</span>
    </div>
  )
}

function TextControls({ value, onChange, name }: { value: TextStyle; onChange: (v: TextStyle) => void; name: string }): React.JSX.Element {
  const set = <K extends keyof TextStyle>(key: K, v: TextStyle[K]): void => onChange({ ...value, [key]: v })
  return (
    <>
      <Row label="Font">
        <FontSelect value={value.font} onChange={(v) => set('font', v)} label={`${name} font`} />
        <label className="check-inline">
          <input type="checkbox" checked={value.bold} onChange={(e) => set('bold', e.target.checked)} /> Bold
        </label>
      </Row>
      <Row label="Colour">
        <ColourPick value={value.color} onChange={(v) => set('color', v)} label={`${name} colour`} />
      </Row>
      <Row label="Largest size">
        <input type="range" min={MIN_TEXT} max={MAX_TEXT} value={value.maxSize} onChange={(e) => set('maxSize', Number(e.target.value))} aria-label={`${name} largest size`} />
        <span className="muted">{value.maxSize}</span>
      </Row>
      <Row label="Across">
        <Seg value={value.align} options={H_OPTIONS} onChange={(v) => set('align', v)} label={`${name} alignment`} />
      </Row>
      <Row label="Up and down">
        <Seg value={value.valign} options={V_OPTIONS} onChange={(v) => set('valign', v)} label={`${name} vertical position`} />
        <label className="check-inline">
          <input type="checkbox" checked={value.shadow} onChange={(e) => set('shadow', e.target.checked)} /> Shadow
        </label>
      </Row>
    </>
  )
}

function ReferenceControls({ value, onChange }: { value: ReferenceStyle; onChange: (v: ReferenceStyle) => void }): React.JSX.Element {
  const set = <K extends keyof ReferenceStyle>(key: K, v: ReferenceStyle[K]): void => onChange({ ...value, [key]: v })
  return (
    <>
      <Row label="Show title">
        <label className="check-inline">
          <input type="checkbox" checked={value.show} onChange={(e) => set('show', e.target.checked)} /> Show the verse title (for example John 3:16 (NIV))
        </label>
      </Row>
      <Row label="Font">
        <FontSelect value={value.font} onChange={(v) => set('font', v)} label="Title font" />
        <label className="check-inline">
          <input type="checkbox" checked={value.bold} onChange={(e) => set('bold', e.target.checked)} /> Bold
        </label>
      </Row>
      <Row label="Colour">
        <ColourPick value={value.color} onChange={(v) => set('color', v)} label="Title colour" />
      </Row>
      <Row label="Size">
        <input type="range" min={MIN_REF} max={MAX_REF} value={value.size} onChange={(e) => set('size', Number(e.target.value))} aria-label="Title size" />
        <span className="muted">{value.size}</span>
      </Row>
      <Row label="Place">
        <Seg value={value.position} options={[['top', 'Above the verse'], ['bottom', 'Below the verse']]} onChange={(v) => set('position', v)} label="Title place" />
      </Row>
      <Row label="Across">
        <Seg value={value.align} options={H_OPTIONS} onChange={(v) => set('align', v)} label="Title alignment" />
      </Row>
    </>
  )
}

export function Themes({ style: saved, onSave, preview }: Props): React.JSX.Element {
  const [section, setSection] = useState<'songs' | 'scripture'>('scripture')
  // Changes stay in a draft, shown in the preview, until Save puts them on the screens.
  const [style, onChange] = useState<DisplayStyle>(saved)
  useEffect(() => onChange(saved), [saved])
  const dirty = useMemo(() => JSON.stringify(style) !== JSON.stringify(saved), [style, saved])
  const sample = section === 'songs' ? SAMPLE_SONG : SAMPLE_VERSE

  return (
    <div className="themes">
      <div className="themes-controls">
        <div className="themes-scroll">
        <div className="themes-head">
          <Seg
            value={section}
            options={[['scripture', 'Scriptures'], ['songs', 'Songs']]}
            onChange={setSection}
            label="What to style"
          />
          <button className="btn small" onClick={() => onChange(DEFAULT_STYLE)}>
            <IconRestore size={14} /> Reset to defaults
          </button>
        </div>
        {section === 'songs' ? (
          <TextControls name="Song" value={style.songs} onChange={(songs) => onChange({ ...style, songs })} />
        ) : (
          <>
            <h3 className="style-group">Verse text</h3>
            <TextControls name="Verse" value={style.scripture} onChange={(scripture) => onChange({ ...style, scripture })} />
            <h3 className="style-group">Verse Title</h3>
            <ReferenceControls value={style.reference} onChange={(reference) => onChange({ ...style, reference })} />
          </>
        )}
        </div>
        <div className="themes-footer">
          <button className="btn primary" onClick={() => onSave(style)} disabled={!dirty}>
            Save
          </button>
          <button className="btn" onClick={() => onChange(saved)} disabled={!dirty}>
            Undo changes
          </button>
          <span className={dirty ? 'unsaved' : 'muted'}>{dirty ? 'Unsaved changes. Save to use them on the screen.' : 'Saved'}</span>
        </div>
      </div>
      <div className="themes-preview">
        <div className="screen-frame">
          <SlideView output={preview(sample, style)} compact />
        </div>
        <span className="muted">Preview of your changes. They reach the screen when you press Save.</span>
      </div>
    </div>
  )
}

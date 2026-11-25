// How text looks on the screen: fonts, colours, size and where things sit.
// Pure data with a forgiving reader, so saved or received settings can never break the screen.

export type HAlign = 'left' | 'center' | 'right'
export type VAlign = 'top' | 'center' | 'bottom'

export interface FontOption {
  /** The CSS font-family name. Also what is saved. */
  family: string
  group: 'Sans-serif' | 'Serif'
}

// Every font here ships inside the app (open SIL OFL licences), so it works offline on any computer.
export const FONTS: readonly FontOption[] = [
  { family: 'Inter', group: 'Sans-serif' },
  { family: 'Open Sans', group: 'Sans-serif' },
  { family: 'Roboto', group: 'Sans-serif' },
  { family: 'Montserrat', group: 'Sans-serif' },
  { family: 'Poppins', group: 'Sans-serif' },
  { family: 'Lato', group: 'Sans-serif' },
  { family: 'Nunito', group: 'Sans-serif' },
  { family: 'Source Sans 3', group: 'Sans-serif' },
  { family: 'Oswald', group: 'Sans-serif' },
  { family: 'Merriweather', group: 'Serif' },
  { family: 'Lora', group: 'Serif' },
  { family: 'Playfair Display', group: 'Serif' },
  { family: 'EB Garamond', group: 'Serif' },
  { family: 'Libre Baskerville', group: 'Serif' }
]

const FONT_NAMES = new Set(FONTS.map((f) => f.family))

export interface TextStyle {
  font: string
  /** Hex colour such as #ffffff, or null to follow the screen (white on dark, black on light). */
  color: string | null
  /** Largest the text may be, in pixels on a 1080-high screen. It still shrinks to fit. */
  maxSize: number
  bold: boolean
  align: HAlign
  valign: VAlign
  shadow: boolean
}

export interface ReferenceStyle {
  show: boolean
  font: string
  color: string | null
  /** Pixels on a 1080-high screen. */
  size: number
  position: 'top' | 'bottom'
  align: HAlign
  bold: boolean
}

export interface DisplayStyle {
  songs: TextStyle
  scripture: TextStyle
  reference: ReferenceStyle
}

export const MIN_TEXT = 40
export const MAX_TEXT = 160
export const MIN_REF = 20
export const MAX_REF = 90

export const DEFAULT_STYLE: DisplayStyle = {
  songs: { font: 'Inter', color: null, maxSize: 160, bold: true, align: 'center', valign: 'center', shadow: false },
  scripture: { font: 'Lora', color: null, maxSize: 160, bold: true, align: 'center', valign: 'center', shadow: false },
  reference: { show: true, font: 'Inter', color: null, size: 64, position: 'bottom', align: 'center', bold: true }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback
}

function colour(value: unknown, fallback: string | null): string | null {
  if (value === null) return null
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback
}

function font(value: unknown, fallback: string): string {
  return typeof value === 'string' && FONT_NAMES.has(value) ? value : fallback
}

const H: readonly HAlign[] = ['left', 'center', 'right']
const V: readonly VAlign[] = ['top', 'center', 'bottom']

function textStyle(value: unknown, d: TextStyle): TextStyle {
  const v = isObject(value) ? value : {}
  return {
    font: font(v.font, d.font),
    color: v.color === undefined ? d.color : colour(v.color, d.color),
    maxSize: num(v.maxSize, MIN_TEXT, MAX_TEXT, d.maxSize),
    bold: typeof v.bold === 'boolean' ? v.bold : d.bold,
    align: pick(v.align, H, d.align),
    valign: pick(v.valign, V, d.valign),
    shadow: typeof v.shadow === 'boolean' ? v.shadow : d.shadow
  }
}

/** Reads any value into a complete, valid style. Missing or bad parts fall back to the defaults. */
export function sanitizeStyle(value: unknown): DisplayStyle {
  const v = isObject(value) ? value : {}
  const r = isObject(v.reference) ? v.reference : {}
  const d = DEFAULT_STYLE.reference
  return {
    songs: textStyle(v.songs, DEFAULT_STYLE.songs),
    scripture: textStyle(v.scripture, DEFAULT_STYLE.scripture),
    reference: {
      show: typeof r.show === 'boolean' ? r.show : d.show,
      font: font(r.font, d.font),
      color: r.color === undefined ? d.color : colour(r.color, d.color),
      size: num(r.size, MIN_REF, MAX_REF, d.size),
      position: pick(r.position, ['top', 'bottom'] as const, d.position),
      align: pick(r.align, H, d.align),
      bold: typeof r.bold === 'boolean' ? r.bold : d.bold
    }
  }
}

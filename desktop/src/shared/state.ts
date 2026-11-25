import { mediaUrl } from './media'
import { makeSampleSchedule } from './sample'
import {
  DEFAULT_DIM,
  type MediaFile,
  type OutputBackground,
  type OutputMode,
  type OutputState,
  type ScheduleItem,
  type Slide,
  type Theme
} from './types'

export type TrayTab = 'songs' | 'scriptures' | 'media' | 'themes'

// A copy of the item that went live, so the screen never changes when the
// schedule is edited afterwards.
export interface LiveSelection {
  itemId: string
  title: string
  slides: Slide[]
  index: number
  /** Resolved when the item went live: a media id or null for none. */
  background: string | null
}

export interface AppState {
  scheduleName: string
  items: ScheduleItem[]
  previewItemId: string | null
  previewIndex: number
  live: LiveSelection | null
  mode: OutputMode
  theme: Theme
  outputTheme: Theme
  alert: string | null
  tab: TrayTab
  media: MediaFile[]
  /** Background for every item that has no choice of its own. */
  defaultBackground: string | null
  dim: number
}

export type Action =
  | { type: 'selectItem'; id: string; index?: number }
  | { type: 'selectSlide'; index: number }
  | { type: 'goLive' }
  | { type: 'toggleLive' }
  | { type: 'showNow'; item: ScheduleItem }
  | { type: 'liveGoto'; index: number }
  | { type: 'liveStep'; delta: number }
  | { type: 'setMode'; mode: OutputMode }
  | { type: 'setTheme'; theme: Theme }
  | { type: 'setOutputTheme'; theme: Theme }
  | { type: 'setAlert'; text: string | null }
  | { type: 'setTab'; tab: TrayTab }
  | { type: 'addItem'; item: ScheduleItem }
  | { type: 'removeItem'; id: string }
  | { type: 'setMedia'; media: MediaFile[] }
  | { type: 'setDefaultBackground'; mediaId: string | null }
  | { type: 'setItemBackground'; itemId: string; background: string | null | undefined }
  | { type: 'setDim'; dim: number }
  | { type: 'newSchedule' }
  | { type: 'loadSchedule'; name: string; items: ScheduleItem[] }

export interface Persisted {
  scheduleName: string
  items: ScheduleItem[]
  theme: Theme
  outputTheme: Theme
  defaultBackground?: string | null
  dim?: number
}

export const DEFAULT_SCHEDULE_NAME = 'Sunday service'

export function createInitialState(persisted?: Persisted | null): AppState {
  const items = persisted?.items ?? makeSampleSchedule()
  return {
    scheduleName: persisted?.scheduleName ?? DEFAULT_SCHEDULE_NAME,
    items,
    previewItemId: items[0]?.id ?? null,
    previewIndex: 0,
    live: null,
    mode: 'black',
    theme: persisted?.theme ?? 'dark',
    outputTheme: persisted?.outputTheme ?? 'dark',
    alert: null,
    tab: 'scriptures',
    media: [],
    defaultBackground: persisted?.defaultBackground ?? null,
    dim: clampDim(persisted?.dim ?? DEFAULT_DIM)
  }
}

export function clampDim(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DIM
  return Math.min(Math.max(Math.round(value), 0), 90)
}

/** The media id an item will show: its own choice, else the service default. */
export function effectiveBackground(item: ScheduleItem | null, defaultBackground: string | null): string | null {
  if (!item) return defaultBackground
  return item.background !== undefined ? item.background : defaultBackground
}

export function resolveBackground(mediaId: string | null, media: MediaFile[]): OutputBackground | null {
  if (mediaId === null) return null
  const file = media.find((m) => m.id === mediaId)
  return file ? { kind: file.kind, url: mediaUrl(file.file) } : null
}

export function backgroundMissing(item: ScheduleItem, state: Pick<AppState, 'media' | 'defaultBackground'>): boolean {
  const id = effectiveBackground(item, state.defaultBackground)
  return id !== null && !state.media.some((m) => m.id === id)
}

function clamp(value: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(Math.max(value, 0), length - 1)
}

export function previewItem(state: AppState): ScheduleItem | null {
  return state.items.find((item) => item.id === state.previewItemId) ?? null
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'selectItem': {
      const item = state.items.find((candidate) => candidate.id === action.id)
      if (!item) return state
      return {
        ...state,
        previewItemId: item.id,
        previewIndex: clamp(action.index ?? 0, item.slides.length)
      }
    }
    case 'selectSlide': {
      const item = previewItem(state)
      if (!item) return state
      return { ...state, previewIndex: clamp(action.index, item.slides.length) }
    }
    case 'goLive': {
      const item = previewItem(state)
      if (!item || item.slides.length === 0) return state
      return {
        ...state,
        mode: 'slide',
        live: {
          itemId: item.id,
          title: item.title,
          slides: item.slides,
          index: clamp(state.previewIndex, item.slides.length),
          background: effectiveBackground(item, state.defaultBackground)
        }
      }
    }
    case 'showNow': {
      // Puts something on the screen straight away without adding it to the schedule.
      if (action.item.slides.length === 0) return state
      return {
        ...state,
        mode: 'slide',
        live: {
          itemId: action.item.id,
          title: action.item.title,
          slides: action.item.slides,
          index: 0,
          background: effectiveBackground(action.item, state.defaultBackground)
        }
      }
    }
    case 'toggleLive': {
      const item = previewItem(state)
      const showing =
        state.mode === 'slide' &&
        state.live !== null &&
        state.live.itemId === item?.id &&
        state.live.index === state.previewIndex
      return showing ? { ...state, mode: 'clear' } : reducer(state, { type: 'goLive' })
    }
    case 'liveGoto': {
      if (!state.live) return state
      return {
        ...state,
        mode: 'slide',
        live: { ...state.live, index: clamp(action.index, state.live.slides.length) }
      }
    }
    case 'liveStep': {
      if (!state.live) return state
      return {
        ...state,
        mode: 'slide',
        live: { ...state.live, index: clamp(state.live.index + action.delta, state.live.slides.length) }
      }
    }
    case 'setMode': {
      const mode = action.mode === state.mode && action.mode !== 'slide' ? 'slide' : action.mode
      return { ...state, mode }
    }
    case 'setTheme':
      return { ...state, theme: action.theme }
    case 'setOutputTheme':
      return { ...state, outputTheme: action.theme }
    case 'setMedia':
      return { ...state, media: action.media }
    case 'setDefaultBackground':
      return { ...state, defaultBackground: action.mediaId }
    case 'setItemBackground':
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id !== action.itemId) return item
          const { background: _old, ...rest } = item
          return action.background === undefined ? rest : { ...rest, background: action.background }
        })
      }
    case 'setDim':
      return { ...state, dim: clampDim(action.dim) }
    case 'setAlert': {
      const text = action.text?.trim() ?? ''
      return { ...state, alert: text === '' ? null : text.slice(0, 200) }
    }
    case 'setTab':
      return { ...state, tab: action.tab }
    case 'addItem':
      return {
        ...state,
        items: [...state.items, action.item],
        previewItemId: action.item.id,
        previewIndex: 0
      }
    case 'removeItem': {
      const index = state.items.findIndex((item) => item.id === action.id)
      if (index === -1) return state
      const items = state.items.filter((item) => item.id !== action.id)
      if (state.previewItemId !== action.id) return { ...state, items }
      const neighbour = items[Math.min(index, items.length - 1)]
      return { ...state, items, previewItemId: neighbour?.id ?? null, previewIndex: 0 }
    }
    case 'newSchedule':
      return {
        ...state,
        scheduleName: DEFAULT_SCHEDULE_NAME,
        items: [],
        previewItemId: null,
        previewIndex: 0
      }
    case 'loadSchedule':
      return {
        ...state,
        scheduleName: action.name,
        items: action.items,
        previewItemId: action.items[0]?.id ?? null,
        previewIndex: 0
      }
  }
}

export function deriveOutput(state: AppState): OutputState {
  const slide = state.live ? (state.live.slides[state.live.index] ?? null) : null
  const mode: OutputMode = state.mode === 'slide' && slide === null ? 'clear' : state.mode
  return {
    mode,
    slide,
    theme: state.outputTheme,
    alert: state.alert,
    background: resolveBackground(state.live ? state.live.background : state.defaultBackground, state.media),
    dim: state.dim
  }
}

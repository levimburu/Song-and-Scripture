import { makeSampleSchedule } from './sample'
import type { OutputMode, OutputState, ScheduleItem, Slide, Theme } from './types'

export type TrayTab = 'songs' | 'scriptures' | 'media' | 'themes'

// A copy of the item that went live, so the screen never changes when the
// schedule is edited afterwards.
export interface LiveSelection {
  itemId: string
  title: string
  slides: Slide[]
  index: number
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
}

export type Action =
  | { type: 'selectItem'; id: string; index?: number }
  | { type: 'selectSlide'; index: number }
  | { type: 'goLive' }
  | { type: 'liveGoto'; index: number }
  | { type: 'liveStep'; delta: number }
  | { type: 'setMode'; mode: OutputMode }
  | { type: 'setTheme'; theme: Theme }
  | { type: 'setOutputTheme'; theme: Theme }
  | { type: 'setAlert'; text: string | null }
  | { type: 'setTab'; tab: TrayTab }
  | { type: 'addItem'; item: ScheduleItem }
  | { type: 'removeItem'; id: string }
  | { type: 'newSchedule' }
  | { type: 'loadSchedule'; name: string; items: ScheduleItem[] }

export interface Persisted {
  scheduleName: string
  items: ScheduleItem[]
  theme: Theme
  outputTheme: Theme
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
    tab: 'scriptures'
  }
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
          index: clamp(state.previewIndex, item.slides.length)
        }
      }
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
  return { mode, slide, theme: state.outputTheme, alert: state.alert }
}

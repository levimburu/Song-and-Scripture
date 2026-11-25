import { DEFAULT_STYLE } from './style'
import { describe, expect, it } from 'vitest'
import { itemFromMedia, itemFromSong, itemFromText } from './schedule'
import {
  backgroundMissing,
  clampDim,
  createInitialState,
  deriveOutput,
  effectiveBackground,
  previewItem,
  reducer,
  type AppState
} from './state'
import type { MediaFile } from './types'

function freshState(): AppState {
  return createInitialState()
}

function songState(): AppState {
  const state = freshState()
  const song = state.items.find((item) => item.type === 'song')!
  return reducer(state, { type: 'selectItem', id: song.id })
}

describe('initial state', () => {
  it('starts with the first item in preview, nothing live and a black screen', () => {
    const state = freshState()
    expect(previewItem(state)?.id).toBe(state.items[0].id)
    expect(state.live).toBeNull()
    expect(state.mode).toBe('black')
    expect(deriveOutput(state)).toEqual({ mode: 'black', slide: null, theme: 'dark', alert: null, background: null, dim: 0, style: DEFAULT_STYLE })
  })

  it('restores saved items and themes', () => {
    const items = [itemFromText('announcement', 'Notice', ['Hello'])]
    const state = createInitialState({
      scheduleName: 'Midweek',
      items,
      theme: 'light',
      outputTheme: 'light'
    })
    expect(state.scheduleName).toBe('Midweek')
    expect(state.items).toBe(items)
    expect(state.theme).toBe('light')
    expect(state.outputTheme).toBe('light')
  })
})

describe('preview selection', () => {
  it('selecting an item resets the slide index', () => {
    let state = songState()
    state = reducer(state, { type: 'selectSlide', index: 2 })
    expect(state.previewIndex).toBe(2)
    const other = state.items.find((item) => item.type === 'scripture')!
    state = reducer(state, { type: 'selectItem', id: other.id })
    expect(state.previewIndex).toBe(0)
  })

  it('clamps slide selection and ignores unknown items', () => {
    let state = songState()
    state = reducer(state, { type: 'selectSlide', index: 99 })
    expect(state.previewIndex).toBe(previewItem(state)!.slides.length - 1)
    state = reducer(state, { type: 'selectSlide', index: -4 })
    expect(state.previewIndex).toBe(0)
    expect(reducer(state, { type: 'selectItem', id: 'nope' })).toBe(state)
  })
})

describe('going live', () => {
  it('copies the previewed slide to the output', () => {
    let state = songState()
    state = reducer(state, { type: 'selectSlide', index: 1 })
    state = reducer(state, { type: 'goLive' })
    expect(state.mode).toBe('slide')
    expect(state.live?.index).toBe(1)
    expect(deriveOutput(state).slide?.label).toBe('Verse 2')
  })

  it('does nothing when there is no preview item', () => {
    const state = reducer(freshState(), { type: 'newSchedule' })
    expect(reducer(state, { type: 'goLive' })).toBe(state)
  })

  it('steps through live slides and clamps at both ends', () => {
    let state = reducer(songState(), { type: 'goLive' })
    const last = state.live!.slides.length - 1
    state = reducer(state, { type: 'liveStep', delta: -1 })
    expect(state.live?.index).toBe(0)
    state = reducer(state, { type: 'liveStep', delta: 100 })
    expect(state.live?.index).toBe(last)
    state = reducer(state, { type: 'liveGoto', index: 2 })
    expect(state.live?.index).toBe(2)
  })

  it('ignores live steps when nothing is live', () => {
    const state = freshState()
    expect(reducer(state, { type: 'liveStep', delta: 1 })).toBe(state)
    expect(reducer(state, { type: 'liveGoto', index: 1 })).toBe(state)
  })

  it('un-blacks the screen when the operator steps a slide', () => {
    let state = reducer(songState(), { type: 'goLive' })
    state = reducer(state, { type: 'setMode', mode: 'black' })
    expect(deriveOutput(state).mode).toBe('black')
    state = reducer(state, { type: 'liveStep', delta: 1 })
    expect(deriveOutput(state).mode).toBe('slide')
  })

  it('keeps showing the live slide after the item is removed from the schedule', () => {
    let state = reducer(songState(), { type: 'goLive' })
    const liveId = state.live!.itemId
    state = reducer(state, { type: 'removeItem', id: liveId })
    expect(state.items.some((item) => item.id === liveId)).toBe(false)
    expect(deriveOutput(state).slide).not.toBeNull()
    expect(deriveOutput(state).mode).toBe('slide')
  })
})

describe('showNow', () => {
  it('puts an item on the screen without adding it to the schedule', () => {
    const state = songState()
    const item = itemFromText('announcement', 'John 3:16', ['For God so loved the world'])
    const next = reducer(state, { type: 'showNow', item })
    expect(next.items).toBe(state.items)
    expect(next.previewItemId).toBe(state.previewItemId)
    expect(next.live?.title).toBe('John 3:16')
    expect(deriveOutput(next).mode).toBe('slide')
    expect(deriveOutput(next).slide?.lines).toEqual(['For God so loved the world'])
  })

  it('lets the operator step through a quick passage and keeps the schedule untouched', () => {
    const item = { ...itemFromText('announcement', 'Psalm 23', ['one']), slides: [0, 1, 2].map((n) => ({ id: `s${n}`, kind: 'scripture' as const, label: `${n}`, lines: [`verse ${n}`] })) }
    let state = reducer(freshState(), { type: 'showNow', item })
    state = reducer(state, { type: 'liveStep', delta: 1 })
    expect(deriveOutput(state).slide?.lines).toEqual(['verse 1'])
    expect(state.items).toHaveLength(freshState().items.length)
  })

  it('takes over from whatever was on the screen, including black', () => {
    let state = reducer(songState(), { type: 'goLive' })
    state = reducer(state, { type: 'setMode', mode: 'black' })
    state = reducer(state, { type: 'showNow', item: itemFromText('announcement', 'X', ['hello']) })
    expect(deriveOutput(state).mode).toBe('slide')
  })

  it('uses the service default background and ignores empty items', () => {
    const base = reducer(freshState(), { type: 'setDefaultBackground', mediaId: 'm9' })
    const item = itemFromText('announcement', 'X', ['hi'])
    expect(reducer(base, { type: 'showNow', item }).live?.background).toBe('m9')
    expect(reducer(base, { type: 'showNow', item: { ...item, slides: [] } })).toBe(base)
  })
})

describe('toggleLive', () => {
  it('shows the preview, then clears it, then shows it again', () => {
    let state = songState()
    state = reducer(state, { type: 'toggleLive' })
    expect(deriveOutput(state).mode).toBe('slide')
    state = reducer(state, { type: 'toggleLive' })
    expect(deriveOutput(state).mode).toBe('clear')
    state = reducer(state, { type: 'toggleLive' })
    expect(deriveOutput(state).mode).toBe('slide')
  })

  it('puts a different previewed slide live instead of clearing', () => {
    let state = reducer(songState(), { type: 'toggleLive' })
    state = reducer(state, { type: 'selectSlide', index: 2 })
    state = reducer(state, { type: 'toggleLive' })
    expect(deriveOutput(state).mode).toBe('slide')
    expect(state.live?.index).toBe(2)
  })
})

describe('output modes', () => {
  it('toggles black, logo and clear on and off', () => {
    let state = reducer(songState(), { type: 'goLive' })
    state = reducer(state, { type: 'setMode', mode: 'logo' })
    expect(state.mode).toBe('logo')
    state = reducer(state, { type: 'setMode', mode: 'logo' })
    expect(state.mode).toBe('slide')
    state = reducer(state, { type: 'setMode', mode: 'black' })
    state = reducer(state, { type: 'setMode', mode: 'clear' })
    expect(state.mode).toBe('clear')
  })

  it('shows a clear screen, not a blank error, when slide mode has no slide', () => {
    const state = reducer(freshState(), { type: 'setMode', mode: 'slide' })
    expect(deriveOutput(state).mode).toBe('clear')
  })

  it('uses the audience theme, not the operator theme, for the output', () => {
    let state = reducer(freshState(), { type: 'setTheme', theme: 'light' })
    expect(deriveOutput(state).theme).toBe('dark')
    state = reducer(state, { type: 'setOutputTheme', theme: 'light' })
    expect(deriveOutput(state).theme).toBe('light')
  })
})

describe('alerts', () => {
  it('trims, clears on empty text and limits length', () => {
    let state = reducer(freshState(), { type: 'setAlert', text: '  Parents to the nursery  ' })
    expect(state.alert).toBe('Parents to the nursery')
    expect(deriveOutput(state).alert).toBe('Parents to the nursery')
    state = reducer(state, { type: 'setAlert', text: '   ' })
    expect(state.alert).toBeNull()
    state = reducer(state, { type: 'setAlert', text: 'x'.repeat(500) })
    expect(state.alert).toHaveLength(200)
    state = reducer(state, { type: 'setAlert', text: null })
    expect(state.alert).toBeNull()
  })
})

describe('schedule editing', () => {
  it('adds an item and selects it', () => {
    const state = freshState()
    const item = itemFromText('announcement', 'Notice', ['Hello'])
    const next = reducer(state, { type: 'addItem', item })
    expect(next.items.at(-1)).toBe(item)
    expect(next.previewItemId).toBe(item.id)
    expect(next.previewIndex).toBe(0)
  })

  it('removing the previewed item selects its neighbour', () => {
    const state = freshState()
    const second = state.items[1]
    let next = reducer(state, { type: 'selectItem', id: second.id })
    next = reducer(next, { type: 'removeItem', id: second.id })
    expect(next.items.some((item) => item.id === second.id)).toBe(false)
    expect(next.previewItemId).toBe(state.items[2].id)
  })

  it('removing the only item leaves nothing selected', () => {
    let state = reducer(freshState(), { type: 'newSchedule' })
    const item = itemFromText('announcement', 'Notice', ['Hello'])
    state = reducer(state, { type: 'addItem', item })
    state = reducer(state, { type: 'removeItem', id: item.id })
    expect(state.items).toEqual([])
    expect(state.previewItemId).toBeNull()
  })

  it('removing a different item keeps the preview where it was', () => {
    const state = freshState()
    const next = reducer(state, { type: 'removeItem', id: state.items[3].id })
    expect(next.previewItemId).toBe(state.previewItemId)
    expect(next.items).toHaveLength(state.items.length - 1)
  })

  it('does not change the screen when the schedule is replaced', () => {
    let state = reducer(songState(), { type: 'goLive' })
    const before = deriveOutput(state)
    state = reducer(state, { type: 'newSchedule' })
    expect(state.items).toEqual([])
    expect(deriveOutput(state)).toEqual(before)
    const items = [itemFromText('announcement', 'Notice', ['Hello'])]
    state = reducer(state, { type: 'loadSchedule', name: 'Midweek', items })
    expect(state.scheduleName).toBe('Midweek')
    expect(state.previewItemId).toBe(items[0].id)
    expect(deriveOutput(state)).toEqual(before)
  })
})

const PHOTO: MediaFile = { id: 'm1', name: 'Sunrise.jpg', kind: 'image', file: 'm1.jpg', size: 10 }
const CLIP: MediaFile = { id: 'm2', name: 'Loop.mp4', kind: 'video', file: 'm2.mp4', size: 10 }

describe('backgrounds', () => {
  function withMedia(): AppState {
    return reducer(songState(), { type: 'setMedia', media: [PHOTO, CLIP] })
  }

  it('does not darken backgrounds unless asked', () => {
    expect(freshState().dim).toBe(0)
  })

  it('shows nothing by default', () => {
    const state = reducer(withMedia(), { type: 'goLive' })
    expect(deriveOutput(state).background).toBeNull()
  })

  it('uses the service default for items without their own choice', () => {
    let state = reducer(withMedia(), { type: 'setDefaultBackground', mediaId: 'm1' })
    state = reducer(state, { type: 'goLive' })
    expect(deriveOutput(state).background).toEqual({ kind: 'image', url: 'sas-media://local/m1.jpg' })
  })

  it('lets an item override the default with a video or with none', () => {
    let state = reducer(withMedia(), { type: 'setDefaultBackground', mediaId: 'm1' })
    const id = state.previewItemId!
    state = reducer(state, { type: 'setItemBackground', itemId: id, background: 'm2' })
    expect(deriveOutput(reducer(state, { type: 'goLive' })).background?.kind).toBe('video')
    state = reducer(state, { type: 'setItemBackground', itemId: id, background: null })
    expect(deriveOutput(reducer(state, { type: 'goLive' })).background).toBeNull()
    state = reducer(state, { type: 'setItemBackground', itemId: id, background: undefined })
    expect(effectiveBackground(previewItem(state), 'm1')).toBe('m1')
    expect('background' in previewItem(state)!).toBe(false)
  })

  it('changes the background in the preview only until Go live is pressed', () => {
    let state = reducer(withMedia(), { type: 'goLive' })
    state = reducer(state, { type: 'setItemBackground', itemId: state.previewItemId!, background: 'm1' })
    expect(deriveOutput(state).background).toBeNull()
    state = reducer(state, { type: 'setDefaultBackground', mediaId: 'm1' })
    expect(deriveOutput(state).background).toBeNull()
    state = reducer(state, { type: 'goLive' })
    expect(deriveOutput(state).background?.kind).toBe('image')
  })

  it('shows a song with its own background and a media item full screen', () => {
    const song = itemFromSong('Test', 'Line one', 12, 'm1')
    expect(song.background).toBe('m1')
    expect(itemFromSong('Test', 'Line one').background).toBeUndefined()
    const poster = itemFromMedia({ id: 'm1', name: 'Poster', kind: 'image', file: 'a.png', size: 1 })
    expect(poster.type).toBe('image')
    expect(poster.background).toBe('m1')
    const state = reducer(withMedia(), { type: 'showNow', item: poster })
    expect(deriveOutput(state).background?.kind).toBe('image')
  })

  it('shows plain black instead of a broken picture when the file is gone', () => {
    let state = withMedia()
    state = reducer(state, { type: 'setItemBackground', itemId: state.previewItemId!, background: 'm1' })
    state = reducer(state, { type: 'setMedia', media: [CLIP] })
    expect(backgroundMissing(previewItem(state)!, state)).toBe(true)
    expect(deriveOutput(reducer(state, { type: 'goLive' })).background).toBeNull()
  })

  it('keeps dim between 0 and 90', () => {
    expect(clampDim(-5)).toBe(0)
    expect(clampDim(150)).toBe(90)
    expect(clampDim(Number.NaN)).toBe(0)
    expect(reducer(freshState(), { type: 'setDim', dim: 65.4 }).dim).toBe(65)
  })
})

describe('Ctrl+C toggle', () => {
  it('takes a shown verse off the screen and shows it again', () => {
    const item = itemFromText('info', 'Verse', ['In the beginning'])
    let state = reducer(freshState(), { type: 'showNow', item, index: 0, toggle: true })
    expect(state.mode).toBe('slide')
    state = reducer(state, { type: 'showNow', item, index: 0, toggle: true })
    expect(state.mode).toBe('clear')
    state = reducer(state, { type: 'showNow', item, index: 0, toggle: true })
    expect(state.mode).toBe('slide')
  })

  it('hides and restores a Show now item with the global Ctrl+C', () => {
    const item = itemFromText('info', 'Verse', ['In the beginning'])
    let state = reducer(freshState(), { type: 'showNow', item })
    state = reducer(state, { type: 'toggleLive' })
    expect(state.mode).toBe('clear')
    state = reducer(state, { type: 'toggleLive' })
    expect(state.mode).toBe('slide')
  })
})

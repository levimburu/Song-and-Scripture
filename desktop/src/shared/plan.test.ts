import { describe, expect, it } from 'vitest'
import { displayOrder, groupItems, moveSegment, moveWithinSegment, newSegment, openSlots, startNewWeek } from './plan'
import { itemFromSong, itemFromText } from './schedule'
import { createInitialState, reducer } from './state'

const mk = (title: string, segmentId?: string) => ({ ...itemFromText('info', title, [title]), segmentId })

describe('service segments', () => {
  const prayer = newSegment('Morning Prayers')
  const praise = newSegment('Praise and Worship')

  it('groups items under their segment, in segment order', () => {
    const items = [mk('Song', praise.id), mk('Opening prayer', prayer.id), mk('Loose')]
    const groups = groupItems(items, [prayer, praise])
    expect(groups.map((g) => g.segment?.name ?? 'none')).toEqual(['none', 'Morning Prayers', 'Praise and Worship'])
    expect(displayOrder(items, [prayer, praise]).map((i) => i.title)).toEqual(['Loose', 'Opening prayer', 'Song'])
  })

  it('treats items of a missing segment as loose', () => {
    const groups = groupItems([mk('Orphan', 'gone')], [prayer])
    expect(groups[0].segment).toBeNull()
    expect(groups[0].items).toHaveLength(1)
  })

  it('moves segments and items within their segment only', () => {
    expect(moveSegment([prayer, praise], praise.id, -1).map((s) => s.name)).toEqual(['Praise and Worship', 'Morning Prayers'])
    const a = mk('A', prayer.id), b = mk('B', praise.id), c = mk('C', prayer.id)
    expect(moveWithinSegment([a, b, c], [prayer, praise], a.id, 1).map((i) => i.title)).toEqual(['C', 'B', 'A'])
    const same = [a, b, c]
    expect(moveWithinSegment(same, [prayer, praise], b.id, 1)).toBe(same)
  })

  it('adds new items to the active segment and keeps them when a segment is removed', () => {
    let state = reducer(createInitialState(), { type: 'newSchedule' })
    state = reducer(state, { type: 'addSegment', name: 'Sermon' })
    const id = state.segments[0].id
    expect(state.activeSegmentId).toBe(id)
    state = reducer(state, { type: 'addItem', item: itemFromText('info', 'Notes', ['x']) })
    expect(state.items[0].segmentId).toBe(id)
    state = reducer(state, { type: 'removeSegment', id })
    expect(state.items).toHaveLength(1)
    expect(state.items[0].segmentId).toBeUndefined()
    expect(state.activeSegmentId).toBeNull()
  })

  it('ignores empty segment names', () => {
    const state = createInitialState()
    expect(reducer(state, { type: 'addSegment', name: '   ' })).toBe(state)
  })
})

describe('weekly blank spots', () => {
  it('turns songs into blank spots and keeps fixed items', () => {
    const seg = newSegment('Praise').id
    const items = [{ ...itemFromSong('Amazing grace', 'a\nb'), segmentId: seg }, itemFromText('offering', 'Offering', ['Give']), itemFromText('info', 'Welcome', ['Hi'])]
    const next = startNewWeek(items)
    expect(next.map((i) => i.title)).toEqual(['Song', 'Offering', 'Welcome'])
    expect(next[0].slot).toBe('song')
    expect(next[0].segmentId).toBe(seg)
    expect(next[0].slides).toEqual([])
    expect(openSlots(next)).toBe(1)
  })

  it('fills a blank spot in place, in the same segment', () => {
    let state = reducer(createInitialState(), { type: 'newSchedule' })
    state = reducer(state, { type: 'addSegment', name: 'Praise' })
    state = reducer(state, { type: 'addSlot', hint: 'song' })
    state = reducer(state, { type: 'addItem', item: itemFromText('info', 'Welcome', ['Hi']) })
    state = reducer(state, { type: 'selectItem', id: state.items[0].id })
    expect(state.tab).toBe('songs')
    expect(state.fillSlotId).toBe(state.items[0].id)
    const filled = reducer(state, { type: 'addItem', item: itemFromSong('Blessed', 'x\ny') })
    expect(filled.items.map((i) => i.title)).toEqual(['Blessed', 'Welcome'])
    expect(filled.items[0].segmentId).toBe(state.activeSegmentId)
    expect(filled.fillSlotId).toBeNull()
  })

  it('does not fill a song spot with a scripture', () => {
    let state = reducer(createInitialState(), { type: 'newSchedule' })
    state = reducer(state, { type: 'addSlot', hint: 'song' })
    state = reducer(state, { type: 'selectItem', id: state.items[0].id })
    const next = reducer(state, { type: 'addItem', item: { ...itemFromText('info', 'Verse', ['x']), type: 'scripture' } })
    expect(next.items).toHaveLength(2)
    expect(next.items[0].slot).toBe('song')
  })
})

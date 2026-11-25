import { describe, expect, it } from 'vitest'
import { displayOrder, groupItems, moveSegment, moveWithinSegment, newSegment } from './plan'
import { itemFromText } from './schedule'
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

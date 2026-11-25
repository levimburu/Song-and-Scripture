import { describe, expect, it } from 'vitest'
import { newSong, parseSongs, searchSongs, seedSongs } from './songs'

describe('song library', () => {
  const songs = [
    newSong('Amazing grace', 'Amazing grace! How sweet the sound'),
    newSong('Great is thy faithfulness', 'Morning by morning new mercies I see'),
    newSong('Grace alone', 'Grace alone, we stand')
  ]
  it('finds by title start, then title words, then lyrics', () => {
    expect(searchSongs(songs, 'gra').map((s) => s.title)).toEqual(['Grace alone', 'Amazing grace'])
    expect(searchSongs(songs, 'grace').map((s) => s.title)).toEqual(['Grace alone', 'Amazing grace'])
    expect(searchSongs(songs, 'mercies').map((s) => s.title)).toEqual(['Great is thy faithfulness'])
    expect(searchSongs(songs, '').length).toBe(3)
  })
  it('survives damaged storage', () => {
    expect(parseSongs(null)).toBeNull()
    expect(parseSongs('{bad')).toBeNull()
    expect(parseSongs(JSON.stringify([{ id: 'x', title: 'ok', lyrics: 'a' }, { nope: 1 }]))).toHaveLength(1)
    expect(parseSongs(JSON.stringify(seedSongs()))).toHaveLength(seedSongs().length)
  })
})

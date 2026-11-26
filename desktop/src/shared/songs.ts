import { uid } from './ids'
import { stripMarkup } from './markup'
import { SAMPLE_SONGS } from './sample'

export interface Song {
  id: string
  title: string
  lyrics: string
  /** How many lines go on one screen (1 to 12). Missing means one paragraph per screen. */
  linesPerScreen?: number
  /** undefined = use the service background, null = none, string = a media id. */
  background?: string | null
}

export const MAX_SONGS = 5000
export const WHOLE_SECTION = 12
export const DEFAULT_LINES = WHOLE_SECTION
const MAX_LYRICS = 20000

export function newSong(title: string, lyrics: string): Song {
  return { id: uid('song'), title: title.trim(), lyrics: lyrics.replace(/\r\n?/g, '\n').trim() }
}

export function seedSongs(): Song[] {
  return SAMPLE_SONGS.map((s) => newSong(s.title, s.lyrics))
}

export function isSong(value: unknown): value is Song {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    v.title.trim() !== '' &&
    typeof v.lyrics === 'string' &&
    v.lyrics.length <= MAX_LYRICS &&
    (v.linesPerScreen === undefined ||
      (typeof v.linesPerScreen === 'number' && Number.isInteger(v.linesPerScreen) && v.linesPerScreen >= 1 && v.linesPerScreen <= 12)) &&
    (v.background === undefined || v.background === null || typeof v.background === 'string')
  )
}

/** Reads the saved library; anything damaged is dropped rather than crashing the app. */
export function parseSongs(raw: string | null): Song[] | null {
  if (raw === null) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data) || data.length > MAX_SONGS) return null
    return data.filter(isSong)
  } catch {
    return null
  }
}

const plain = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ')

/** Title matches first (starts-with, then contains), then songs whose words appear in the lyrics. */
export function searchSongs(songs: Song[], query: string): Song[] {
  const q = plain(query).trim().replace(/\s+/g, ' ')
  const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title))
  if (q === '') return sorted
  const words = q.split(' ')
  const starts: Song[] = []
  const contains: Song[] = []
  const lyric: Song[] = []
  for (const song of sorted) {
    const title = plain(song.title)
    if (title.startsWith(q)) starts.push(song)
    else if (words.every((w) => title.includes(w))) contains.push(song)
    else {
      const body = plain(stripMarkup(song.lyrics))
      if (words.every((w) => body.includes(w))) lyric.push(song)
    }
  }
  return [...starts, ...contains, ...lyric]
}

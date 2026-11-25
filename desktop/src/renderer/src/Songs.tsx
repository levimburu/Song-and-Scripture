import { IconEdit, IconPlayerPlayFilled, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { splitLyrics } from '../../shared/lyrics'
import { itemFromSong } from '../../shared/schedule'
import { newSong, parseSongs, searchSongs, seedSongs, type Song } from '../../shared/songs'
import type { ScheduleItem } from '../../shared/types'

const SONGS_KEY = 'sas.songs.v1'

function loadSongs(): Song[] {
  try {
    return parseSongs(localStorage.getItem(SONGS_KEY)) ?? seedSongs()
  } catch {
    return seedSongs()
  }
}

interface Props {
  onAdd: (item: ScheduleItem) => void
  onShowNow: (item: ScheduleItem, index?: number) => void
}

export function Songs({ onAdd, onShowNow }: Props): React.JSX.Element {
  const [songs, setSongs] = useState<Song[]>(loadSongs)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickedSlide, setPickedSlide] = useState(0)
  const [editing, setEditing] = useState<{ id: string | null; title: string; lyrics: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
    } catch {
      // Storage full or blocked: the app still works, the library just will not persist.
    }
  }, [songs])

  const found = useMemo(() => searchSongs(songs, query), [songs, query])
  const song = found.find((s) => s.id === selectedId) ?? found[0] ?? null
  const slides = useMemo(() => (song ? splitLyrics(song.lyrics) : []), [song])

  useEffect(() => {
    listRef.current?.querySelector('.picked')?.scrollIntoView({ block: 'nearest' })
  }, [song?.id])

  function select(id: string): void {
    setSelectedId(id)
    setPickedSlide(0)
    setConfirmDelete(false)
  }

  function show(index = pickedSlide): void {
    if (song) onShowNow(itemFromSong(song.title, song.lyrics), index)
  }

  function save(): void {
    if (!editing) return
    const title = editing.title.trim()
    if (title === '' || editing.lyrics.trim() === '') return
    if (editing.id) {
      setSongs((all) => all.map((s) => (s.id === editing.id ? { ...s, title, lyrics: editing.lyrics.replace(/\r\n?/g, '\n').trim() } : s)))
      setSelectedId(editing.id)
    } else {
      const created = newSong(title, editing.lyrics)
      setSongs((all) => [...all, created])
      setSelectedId(created.id)
      setQuery('')
    }
    setEditing(null)
  }

  function remove(): void {
    if (!song) return
    setSongs((all) => all.filter((s) => s.id !== song.id))
    setSelectedId(null)
    setConfirmDelete(false)
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    const input = e.currentTarget
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const at = song ? found.findIndex((s) => s.id === song.id) : -1
      const next = found[Math.min(Math.max(at + (e.key === 'ArrowDown' ? 1 : -1), 0), found.length - 1)]
      if (next) select(next.id)
    } else if (e.key === 'Enter') show(0)
    else if (e.key.toLowerCase() === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd && song) {
      e.preventDefault()
      show(0)
    }
  }

  const stanzaCount = editing ? splitLyrics(editing.lyrics).length : 0

  return (
    <div className="songs">
      <div className="songs-left">
        <div className="songs-search">
          <label className="search">
            <IconSearch size={16} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedId(null)
              }}
              onKeyDown={onSearchKey}
              placeholder="Song title or words. Enter shows it."
              aria-label="Search songs"
              autoComplete="off"
              autoFocus
            />
          </label>
          <button className="btn small" onClick={() => setEditing({ id: null, title: '', lyrics: '' })}>
            <IconPlus size={14} /> New song
          </button>
        </div>
        <ul className="song-list" ref={listRef} aria-label="Songs">
          {found.map((s) => (
            <li
              key={s.id}
              className={`song-row${song?.id === s.id ? ' picked' : ''}`}
              onClick={() => select(s.id)}
              onDoubleClick={() => onShowNow(itemFromSong(s.title, s.lyrics), 0)}
              title="Double-click to show"
            >
              {s.title}
            </li>
          ))}
          {found.length === 0 && (
            <li className="empty">{songs.length === 0 ? 'No songs yet. Click New song.' : 'No song matches.'}</li>
          )}
        </ul>
      </div>

      <div className="songs-right">
        {song ? (
          <>
            <div className="scripture-result">
              <strong>{song.title}</strong>
              <span className="scripture-actions">
                <button className="btn small go-live" onClick={() => show()}>
                  <IconPlayerPlayFilled size={14} /> Show now
                </button>
                <button className="btn small" onClick={() => onAdd(itemFromSong(song.title, song.lyrics))}>
                  <IconPlus size={14} /> Add to schedule
                </button>
                <button
                  className="btn small"
                  onClick={() => setEditing({ id: song.id, title: song.title, lyrics: song.lyrics })}
                >
                  <IconEdit size={14} /> Edit
                </button>
                {confirmDelete ? (
                  <button className="btn small danger" onClick={remove}>Click again to delete</button>
                ) : (
                  <button className="btn small" onClick={() => setConfirmDelete(true)} aria-label="Delete song">
                    <IconTrash size={14} />
                  </button>
                )}
              </span>
            </div>
            <ul className="verse-list song-slides" aria-label="Sections">
              {slides.map((slide, i) => (
                <li
                  key={slide.id}
                  className={`verse-row${pickedSlide === i ? ' picked' : ''}`}
                  onClick={() => setPickedSlide(i)}
                  onDoubleClick={() => show(i)}
                >
                  <span className="verse-num wide">{slide.label}</span>
                  <span className="verse-text">{slide.lines.join(' / ')}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="empty">Pick a song, or click New song to type or paste one in.</p>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal wide" role="dialog" aria-modal="true" aria-label={editing.id ? 'Edit song' : 'New song'}>
            <h2>{editing.id ? 'Edit song' : 'New song'}</h2>
            <label className="field">
              Title
              <input
                value={editing.title}
                maxLength={120}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                aria-label="Song title"
                autoFocus
              />
            </label>
            <label className="field">
              Lyrics
              <textarea
                value={editing.lyrics}
                rows={14}
                maxLength={20000}
                onChange={(e) => setEditing({ ...editing, lyrics: e.target.value })}
                aria-label="Song lyrics"
                placeholder={'Verse 1\nLine one\nLine two\n\nChorus\nLine one\nLine two'}
              />
            </label>
            <p className="muted">
              Leave a blank line between sections. Optional headings such as Verse 1, Chorus or Bridge on their own line
              label each section. Long sections split into screens automatically.
              {stanzaCount > 0 && ` ${stanzaCount} screen${stanzaCount === 1 ? '' : 's'}.`}
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" disabled={editing.title.trim() === '' || editing.lyrics.trim() === ''} onClick={save}>
                Save song
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

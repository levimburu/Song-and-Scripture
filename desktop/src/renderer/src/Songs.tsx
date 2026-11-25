import { IconEdit, IconPlayerPlayFilled, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isSectionHeader, splitLyrics } from '../../shared/lyrics'
import { itemFromSong } from '../../shared/schedule'
import { DEFAULT_LINES, newSong, parseSongs, searchSongs, seedSongs, WHOLE_SECTION, type Song } from '../../shared/songs'
import type { OutputState, ScheduleItem, Slide } from '../../shared/types'
import { SlideView } from './SlideView'

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
  preview: (slide: Slide) => OutputState
}

export function Songs({ onAdd, onShowNow, preview }: Props): React.JSX.Element {
  const [songs, setSongs] = useState<Song[]>(loadSongs)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickedSlide, setPickedSlide] = useState(0)
  const [editing, setEditing] = useState<{ id: string | null; title: string; lyrics: string; lines: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const [caret, setCaret] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
    } catch {
      // Storage full or blocked: the app still works, the library just will not persist.
    }
  }, [songs])

  const found = useMemo(() => searchSongs(songs, query), [songs, query])
  const song = found.find((s) => s.id === selectedId) ?? found[0] ?? null
  const lines = song?.linesPerScreen ?? DEFAULT_LINES
  const slides = useMemo(() => (song ? splitLyrics(song.lyrics, { maxLines: lines }) : []), [song, lines])

  useEffect(() => {
    listRef.current?.querySelector('.picked')?.scrollIntoView({ block: 'nearest' })
  }, [song?.id])

  function select(id: string): void {
    setSelectedId(id)
    setPickedSlide(0)
    setConfirmDelete(false)
  }

  function show(index = pickedSlide): void {
    if (song) onShowNow(itemFromSong(song.title, song.lyrics, lines), index)
  }

  function setLines(value: number): void {
    if (!song) return
    setSongs((all) => all.map((s) => (s.id === song.id ? { ...s, linesPerScreen: value } : s)))
    setPickedSlide(0)
  }

  function save(): void {
    if (!editing) return
    const title = editing.title.trim()
    if (title === '' || editing.lyrics.trim() === '') return
    if (editing.id) {
      setSongs((all) => all.map((s) => (s.id === editing.id ? { ...s, title, lyrics: editing.lyrics.replace(/\r\n?/g, '\n').trim(), linesPerScreen: editing.lines } : s)))
      setSelectedId(editing.id)
    } else {
      const created = { ...newSong(title, editing.lyrics), linesPerScreen: editing.lines }
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

  // The screen the cursor is in, so the editor shows what the audience will see.
  const editSlides = useMemo(() => (editing ? splitLyrics(editing.lyrics, { maxLines: editing.lines }) : []), [editing])
  const caretSlide = useMemo(() => {
    if (!editing || editSlides.length === 0) return null
    // Count the lyric lines (not blank lines or headings) up to the cursor, then find the screen that holds that line.
    const upTo = editing.lyrics.slice(0, caret).replace(/\r\n?/g, '\n').split('\n')
    const current = upTo.length > 0 && upTo[upTo.length - 1].trim() !== '' && !isSectionHeader(upTo[upTo.length - 1])
    let n = upTo.filter((l) => l.trim() !== '' && !isSectionHeader(l)).length
    if (!current) n += 1 // on a blank or heading line: show the screen that comes next
    let seen = 0
    for (const slide of editSlides) {
      seen += slide.lines.length
      if (n <= seen) return slide
    }
    return editSlides[editSlides.length - 1]
  }, [editing, editSlides, caret])

  const stanzaCount = editing ? splitLyrics(editing.lyrics, { maxLines: editing.lines }).length : 0

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
              data-autofocus
            />
          </label>
          <button className="btn small" onClick={() => setEditing({ id: null, title: '', lyrics: '', lines: DEFAULT_LINES })}>
            <IconPlus size={14} /> New song
          </button>
        </div>
        <ul className="song-list" ref={listRef} aria-label="Songs">
          {found.map((s) => (
            <li
              key={s.id}
              className={`song-row${song?.id === s.id ? ' picked' : ''}`}
              onClick={() => select(s.id)}
              onDoubleClick={() => onShowNow(itemFromSong(s.title, s.lyrics, s.linesPerScreen ?? DEFAULT_LINES), 0)}
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
            <div className="song-head">
              <strong>
                {song.title}
                <span className="count">{slides.length} screen{slides.length === 1 ? '' : 's'}</span>
              </strong>
              <span className="scripture-actions">
                <select className="mini" value={lines} onChange={(e) => setLines(Number(e.target.value))} aria-label="Lines per screen">
                  <option value={WHOLE_SECTION}>Whole paragraph</option>
                  <option value={1}>1 line</option>
                  <option value={2}>2 lines</option>
                  <option value={3}>3 lines</option>
                  <option value={4}>4 lines</option>
                </select>
                <button className="btn small go-live" onClick={() => show()}>
                  <IconPlayerPlayFilled size={14} /> Show now
                </button>
                <button className="btn small" onClick={() => onAdd(itemFromSong(song.title, song.lyrics, lines))}>
                  <IconPlus size={14} /> Add
                </button>
                <button
                  className="btn small"
                  onClick={() => setEditing({ id: song.id, title: song.title, lyrics: song.lyrics, lines })}
                  aria-label="Edit song"
                >
                  <IconEdit size={14} /> Edit
                </button>
                {confirmDelete ? (
                  <button className="btn small danger" onClick={remove}>Delete?</button>
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
          <div className="modal xwide" role="dialog" aria-modal="true" aria-label={editing.id ? 'Edit song' : 'New song'}>
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
            <div className="editor-split">
            <label className="field">
              Lyrics
              <textarea
                value={editing.lyrics}
                rows={14}
                maxLength={20000}
                onChange={(e) => {
                  setEditing({ ...editing, lyrics: e.target.value })
                  setCaret(e.target.selectionStart)
                }}
                onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
                onClick={(e) => setCaret(e.currentTarget.selectionStart)}
                aria-label="Song lyrics"
                placeholder={'Verse 1\nLine one\nLine two\n\nChorus\nLine one\nLine two'}
              />
            </label>
            <div className="editor-preview" aria-label="Preview">
              <div className="screen-frame">
                <SlideView output={preview(caretSlide ?? { id: 'p', kind: 'verse', label: '', lines: [''] })} compact />
              </div>
              <span className="muted">Preview of the screen your cursor is in.</span>
            </div>
            </div>
            <div className="lines-row">
              <span>Each screen shows</span>
              {[WHOLE_SECTION, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`btn small${editing.lines === n ? ' on' : ''}`}
                  onClick={() => setEditing({ ...editing, lines: n })}
                  aria-pressed={editing.lines === n}
                >
                  {n === WHOLE_SECTION ? 'Whole paragraph' : n === 1 ? '1 line' : `${n} lines`}
                </button>
              ))}
              <span className="muted">at a time{stanzaCount > 0 && `: ${stanzaCount} screen${stanzaCount === 1 ? '' : 's'}`}.</span>
            </div>
            <p className="muted">
              Each paragraph is one screen: press Enter twice (leave a blank line) where you want the next screen to start.
              While the song is live, press the Down arrow for the next screen and Up to go back. Headings such as Verse 1 or
              Chorus on their own line are optional.
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

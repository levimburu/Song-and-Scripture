import { IconEdit, IconPlayerPlayFilled, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isSectionHeader, splitLyrics } from '../../shared/lyrics'
import { itemFromSong } from '../../shared/schedule'
import { DEFAULT_LINES, newSong, parseSongs, searchSongs, seedSongs, WHOLE_SECTION, type Song } from '../../shared/songs'
import type { MediaFile, OutputState, ScheduleItem, Slide } from '../../shared/types'
import { applyColour, applyScale, clearColour, clearFormatting, stripMarkup, type Edit } from '../../shared/markup'
import { BackgroundPicker } from './BackgroundPicker'
import { ColourPick } from './Themes'
import { SlideView } from './SlideView'

const WORDS = {
  songs: {
    key: 'sas.songs.v1',
    plain: false,
    add: 'New song',
    placeholder: 'Song title or words. Enter shows it.',
    list: 'Songs',
    none: 'No songs yet. Click New song.',
    noMatch: 'No song matches.',
    pick: 'Pick a song, or click New song to type or paste one in.',
    titleHint: 'Song title',
    lyricsHint: 'Song lyrics',
    sample: 'Verse 1\nLine one\nLine two\n\nChorus\nLine one\nLine two',
    help: 'Each paragraph is one screen: press Enter twice (leave a blank line) where you want the next screen to start. While the song is live, press the Down arrow for the next screen and Up to go back. Headings such as Verse 1 or Chorus on their own line are optional.',
    textLabel: 'Lyrics',
    bgLabel: 'Background for this song'
  },
  program: {
    key: 'sas.program.v1',
    plain: true,
    add: 'New entry',
    placeholder: 'Search the program. Enter shows it.',
    list: 'Program entries',
    none: 'Nothing here yet. Click New entry for sermon notes, names, testimonies, announcements.',
    noMatch: 'No entry matches.',
    pick: 'Pick an entry, or click New entry to type one in: sermon notes, names to welcome, testimonies, birthdays, announcements.',
    titleHint: 'Entry title',
    lyricsHint: 'Entry text',
    sample: 'First point of the sermon\n\nSecond point\nWith a line under it\n\nOr one name per line:\nMary Wanjiru\nJohn Kiprop',
    help: 'Each paragraph is one screen: press Enter twice (leave a blank line) where you want the next screen to start. For a list of names, put one name on each line and choose how many lines to show at a time. While it is live, press the Down arrow for the next screen and Up to go back.',
    textLabel: 'Text',
    bgLabel: 'Background for this entry'
  }
} as const

function loadSongs(variant: 'songs' | 'program'): Song[] {
  try {
    return parseSongs(localStorage.getItem(WORDS[variant].key)) ?? (variant === 'songs' ? seedSongs() : [])
  } catch {
    return variant === 'songs' ? seedSongs() : []
  }
}

interface Props {
  variant?: 'songs' | 'program'
  onAdd: (item: ScheduleItem) => void
  onShowNow: (item: ScheduleItem, index?: number, toggle?: boolean) => void
  preview: (slide: Slide, background?: string | null) => OutputState
  media: MediaFile[]
  onAddMedia: () => void
}

export function Songs({ variant = 'songs', onAdd, onShowNow, preview, media, onAddMedia }: Props): React.JSX.Element {
  const w = WORDS[variant]
  const SONGS_KEY = w.key
  const [songs, setSongs] = useState<Song[]>(() => loadSongs(variant))
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickedSlide, setPickedSlide] = useState(0)
  const [editing, setEditing] = useState<{ id: string | null; title: string; lyrics: string; lines: number; background?: string | null } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const [caret, setCaret] = useState(0)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [lastColour, setLastColour] = useState<string | null>(null)
  const [formatHint, setFormatHint] = useState(false)

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
  const slides = useMemo(() => (song ? splitLyrics(song.lyrics, { maxLines: lines, plain: w.plain }) : []), [song, lines])

  useEffect(() => {
    listRef.current?.querySelector('.picked')?.scrollIntoView({ block: 'nearest' })
  }, [song?.id])

  function select(id: string): void {
    setSelectedId(id)
    setPickedSlide(0)
    setConfirmDelete(false)
  }

  function show(index = pickedSlide, toggle = false): void {
    if (song) onShowNow(itemFromSong(song.title, song.lyrics, lines, song.background, w.plain), index, toggle)
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
      setSongs((all) => all.map((s) => (s.id === editing.id ? { ...s, title, lyrics: editing.lyrics.replace(/\r\n?/g, '\n').trim(), linesPerScreen: editing.lines, background: editing.background } : s)))
      setSelectedId(editing.id)
    } else {
      const created = { ...newSong(title, editing.lyrics), linesPerScreen: editing.lines, background: editing.background }
      setSongs((all) => [...all, created])
      setSelectedId(created.id)
      setQuery('')
    }
    setEditing(null)
  }

  /** Colours or resizes the words selected in the text box. The selection stays so another change can follow. */
  function format(change: (text: string, start: number, end: number) => Edit): void {
    const el = textRef.current
    if (!el || !editing) return
    const { selectionStart: start, selectionEnd: end } = el
    if (start === end) {
      setFormatHint(true)
      el.focus()
      return
    }
    setFormatHint(false)
    const edit = change(editing.lyrics, start, end)
    setEditing({ ...editing, lyrics: edit.text })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(edit.start, edit.end)
    })
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
      show(0, true)
    }
  }

  // The screen the cursor is in, so the editor shows what the audience will see.
  const editSlides = useMemo(() => (editing ? splitLyrics(editing.lyrics, { maxLines: editing.lines, plain: w.plain }) : []), [editing])
  const caretSlide = useMemo(() => {
    if (!editing || editSlides.length === 0) return null
    // Count the lyric lines (not blank lines or headings) up to the cursor, then find the screen that holds that line.
    const upTo = editing.lyrics.slice(0, caret).replace(/\r\n?/g, '\n').split('\n')
    const current = upTo.length > 0 && upTo[upTo.length - 1].trim() !== '' && (w.plain || !isSectionHeader(upTo[upTo.length - 1]))
    let n = upTo.filter((l) => l.trim() !== '' && (w.plain || !isSectionHeader(l))).length
    if (!current) n += 1 // on a blank or heading line: show the screen that comes next
    let seen = 0
    for (const slide of editSlides) {
      seen += slide.lines.length
      if (n <= seen) return slide
    }
    return editSlides[editSlides.length - 1]
  }, [editing, editSlides, caret])

  const stanzaCount = editing ? splitLyrics(editing.lyrics, { maxLines: editing.lines, plain: w.plain }).length : 0

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
              placeholder={w.placeholder}
              aria-label={`Search ${w.list.toLowerCase()}`}
              autoComplete="off"
              autoFocus
              data-autofocus
            />
          </label>
          <button className="btn small" onClick={() => setEditing({ id: null, title: '', lyrics: '', lines: DEFAULT_LINES })}>
            <IconPlus size={14} /> {w.add}
          </button>
        </div>
        <ul className="song-list" ref={listRef} aria-label={w.list}>
          {found.map((s) => (
            <li
              key={s.id}
              className={`song-row${song?.id === s.id ? ' picked' : ''}`}
              onClick={() => select(s.id)}
              onDoubleClick={() => onShowNow(itemFromSong(s.title, s.lyrics, s.linesPerScreen ?? DEFAULT_LINES, s.background, w.plain), 0)}
              title="Double-click to show"
            >
              {s.title}
            </li>
          ))}
          {found.length === 0 && (
            <li className="empty">{songs.length === 0 ? w.none : w.noMatch}</li>
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
                <button className="btn small" onClick={() => onAdd(itemFromSong(song.title, song.lyrics, lines, song.background, w.plain))}>
                  <IconPlus size={14} /> Add
                </button>
                <button
                  className="btn small"
                  onClick={() => setEditing({ id: song.id, title: song.title, lyrics: song.lyrics, lines, background: song.background })}
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
                  <span className="verse-text">{stripMarkup(slide.lines.join(' / '))}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="empty">{w.pick}</p>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal xwide" role="dialog" aria-modal="true" aria-label={editing.id ? `Edit ${w.titleHint.split(' ')[0].toLowerCase()}` : w.add}>
            <h2>{editing.id ? `Edit ${w.titleHint.split(' ')[0].toLowerCase()}` : w.add}</h2>
            <label className="field">
              Title
              <input
                value={editing.title}
                maxLength={120}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                aria-label={w.titleHint}
                autoFocus
              />
            </label>
            <div className="editor-split">
            <div className="field">
              {w.textLabel}
              <div className="format-bar" role="toolbar" aria-label="Text formatting">
                <ColourPick
                  label="Text colour"
                  value={lastColour}
                  onChange={(c) => {
                    setLastColour(c)
                    format(c ? (t, s, e) => applyColour(t, s, e, c) : clearColour)
                  }}
                />
                <button className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => format((t, s, e) => applyScale(t, s, e, 1.25))} title="Make the selected words bigger" aria-label="Bigger">A+</button>
                <button className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => format((t, s, e) => applyScale(t, s, e, 0.8))} title="Make the selected words smaller" aria-label="Smaller">A−</button>
                <button className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => format(clearFormatting)} title="Remove colour and size from the selected words">Clear</button>
                <span className={formatHint ? 'unsaved' : 'muted'}>{formatHint ? 'Select the words first.' : 'Select words, then pick a colour or size.'}</span>
              </div>
              <textarea
                ref={textRef}
                value={editing.lyrics}
                rows={14}
                maxLength={20000}
                onChange={(e) => {
                  setEditing({ ...editing, lyrics: e.target.value })
                  setCaret(e.target.selectionStart)
                }}
                onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
                onClick={(e) => setCaret(e.currentTarget.selectionStart)}
                aria-label={w.lyricsHint}
                placeholder={w.sample}
              />
            </div>
            <div className="editor-preview" aria-label="Preview">
              <div className="screen-frame">
                <SlideView output={preview(caretSlide ?? { id: 'p', kind: 'verse', label: '', lines: [''] }, editing.background)} compact />
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
            <div className="song-bg">
              <span>{w.bgLabel}</span>
              <BackgroundPicker
                media={media}
                value={editing.background}
                onChange={(background) => setEditing({ ...editing, background })}
                onAdd={onAddMedia}
                inheritLabel="Same as service"
              />
            </div>
            <p className="muted">{w.help}</p>
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

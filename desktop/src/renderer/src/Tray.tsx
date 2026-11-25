import { IconPlayerPlayFilled, IconPlus, IconSearch } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { formatReference, lookupPassage, parseReference, searchVerses } from '../../shared/bible'
import { SAMPLE_SONGS } from '../../shared/sample'
import { itemFromScripture, itemFromSong } from '../../shared/schedule'
import type { TrayTab } from '../../shared/state'
import type { BibleSummary, ScheduleItem } from '../../shared/types'
import { MediaTab } from './MediaTab'

const TABS: { id: TrayTab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'scriptures', label: 'Scriptures' },
  { id: 'media', label: 'Media' },
  { id: 'themes', label: 'Themes' }
]

export interface BiblePickerProps {
  versions: BibleSummary[]
  version: string
  onVersion: (version: string) => void
  onAddBible: () => void
  onRemoveBible: (version: string) => void
}

interface Props {
  tab: TrayTab
  onTab: (tab: TrayTab) => void
  onAdd: (item: ScheduleItem) => void
  /** Puts an item on the screen straight away, starting at the given slide. */
  onShowNow: (item: ScheduleItem, index?: number) => void
  media: React.ComponentProps<typeof MediaTab>
  bibles: BiblePickerProps
}

export function Tray({ tab, onTab, onAdd, onShowNow, media, bibles }: Props): React.JSX.Element {
  return (
    <section className="tray">
      <nav className="tray-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tab} className={`tab${t.id === tab ? ' active' : ''}`} onClick={() => onTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="tray-body">
        {tab === 'songs' && <Songs onAdd={onAdd} />}
        {tab === 'scriptures' && <Scriptures onAdd={onAdd} onShowNow={onShowNow} {...bibles} />}
        {tab === 'media' && <MediaTab {...media} />}
        {tab === 'themes' && <p className="empty">Themes come in a later milestone: fonts, backgrounds and church logo.</p>}
      </div>
    </section>
  )
}

function Songs({ onAdd }: { onAdd: (item: ScheduleItem) => void }): React.JSX.Element {
  const [query, setQuery] = useState('')
  const songs = useMemo(
    () => SAMPLE_SONGS.filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase())),
    [query]
  )
  return (
    <div className="tray-split">
      <label className="search">
        <IconSearch size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs" aria-label="Search songs" />
      </label>
      <ul className="tray-list">
        {songs.map((song) => (
          <li key={song.title}>
            <span>{song.title}</span>
            <button className="btn small" onClick={() => onAdd(itemFromSong(song.title, song.lyrics))}>
              <IconPlus size={14} /> Add
            </button>
          </li>
        ))}
        {songs.length === 0 && <li className="empty">No songs match.</li>}
      </ul>
    </div>
  )
}

function Scriptures({
  onAdd,
  onShowNow,
  versions,
  version,
  onVersion,
  onAddBible,
  onRemoveBible
}: { onAdd: (item: ScheduleItem) => void; onShowNow: Props['onShowNow'] } & BiblePickerProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<number | null>(null)

  const current = versions.find((v) => v.version === version)
  const ref = useMemo(() => parseReference(text), [text])
  const result = useMemo(() => (ref ? lookupPassage(ref, version) : null), [ref, version])
  // Anything that is not a reference is treated as words from a verse.
  const hits = useMemo(() => (text.trim() !== '' && !ref ? searchVerses(text, version) : []), [text, ref, version])

  function showPassage(startAt = 0): void {
    if (result) onShowNow(itemFromScripture(result), startAt)
  }

  function showHit(book: string, chapter: number, verse: number): void {
    const chapterResult = lookupPassage({ book, chapter }, version)
    if (!chapterResult) return
    const index = chapterResult.verses.findIndex((v) => v.verse === verse)
    onShowNow(itemFromScripture(chapterResult), Math.max(index, 0))
  }

  let note = 'Type a reference such as John 3:16, or some words from a verse.'
  if (text.trim() !== '') {
    if (ref && !result) note = `${formatReference(ref)} was not found in ${current?.name ?? version}.`
    else if (result) note = `${result.reference}: ${result.verses.length} verse${result.verses.length === 1 ? '' : 's'}. Double-click a verse to show it.`
    else if (hits.length > 0) note = `${hits.length}${hits.length === 30 ? '+' : ''} verse${hits.length === 1 ? '' : 's'} match. Double-click one to show it.`
    else note = 'No verse matches. Check the spelling, or type a reference such as John 3:16.'
  }

  return (
    <div className="tray-split">
      <div className="bible-row">
        <label>
          Version
          <select value={version} onChange={(e) => onVersion(e.target.value)} aria-label="Bible version">
            {versions.map((v) => (
              <option key={v.version} value={v.version}>
                {v.version} – {v.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn small" onClick={onAddBible}>Add a Bible…</button>
        {version !== 'KJV' && (
          <button className="btn small" onClick={() => onRemoveBible(version)}>Remove {version}</button>
        )}
      </div>
      <label className="search">
        <IconSearch size={16} />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setPicked(null)
          }}
          onKeyDown={(e) => {
            const input = e.currentTarget
            const hasSelection = input.selectionStart !== input.selectionEnd
            if (e.key === 'Enter' && result) showPassage(picked ?? 0)
            // Ctrl+C shows the passage, unless text is selected (then it copies as usual).
            else if (e.key.toLowerCase() === 'c' && e.ctrlKey && !hasSelection && result) {
              e.preventDefault()
              showPassage(picked ?? 0)
            }
          }}
          placeholder="Reference (John 3:16) or words from a verse. Enter shows it."
          aria-label="Scripture reference"
          autoFocus
        />
      </label>
      <div className="scripture-result">
        <span className={result || hits.length > 0 ? '' : 'muted'}>{note}</span>
        <span className="scripture-actions">
          <button className="btn small go-live" disabled={!result} onClick={() => showPassage(picked ?? 0)}>
            <IconPlayerPlayFilled size={14} /> Show now
          </button>
          <button className="btn small" disabled={!result} onClick={() => result && onAdd(itemFromScripture(result))}>
            <IconPlus size={14} /> Add to schedule
          </button>
        </span>
      </div>

      {result && (
        <ul className="verse-list" aria-label="Verses">
          {result.verses.map((v, i) => (
            <li
              key={v.verse}
              className={`verse-row${picked === i ? ' picked' : ''}`}
              onClick={() => setPicked(i)}
              onDoubleClick={() => showPassage(i)}
            >
              <span className="verse-num">{v.verse}</span>
              <span className="verse-text">{v.text}</span>
            </li>
          ))}
        </ul>
      )}

      {hits.length > 0 && (
        <ul className="verse-list" aria-label="Matching verses">
          {hits.map((h) => (
            <li
              key={h.reference}
              className="verse-row"
              onClick={() => setText(h.reference)}
              onDoubleClick={() => showHit(h.book, h.chapter, h.verse)}
              title="Double-click to show"
            >
              <span className="verse-num wide">{h.reference}</span>
              <span className="verse-text">{h.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

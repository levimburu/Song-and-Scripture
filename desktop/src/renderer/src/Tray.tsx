import { IconPlayerPlayFilled, IconPlus, IconSearch } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { formatReference, lookupPassage, parseReference } from '../../shared/bible'
import type { BibleSummary } from '../../shared/types'
import { SAMPLE_SONGS } from '../../shared/sample'
import { itemFromScripture, itemFromSong } from '../../shared/schedule'
import type { ScheduleItem } from '../../shared/types'
import type { TrayTab } from '../../shared/state'
import { MediaTab } from './MediaTab'

const TABS: { id: TrayTab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'scriptures', label: 'Scriptures' },
  { id: 'media', label: 'Media' },
  { id: 'themes', label: 'Themes' }
]

interface Props {
  tab: TrayTab
  onTab: (tab: TrayTab) => void
  onAdd: (item: ScheduleItem) => void
  onShowNow: (item: ScheduleItem) => void
  media: React.ComponentProps<typeof MediaTab>
  bibles: BiblePickerProps
}

export interface BiblePickerProps {
  versions: BibleSummary[]
  version: string
  onVersion: (version: string) => void
  onAddBible: () => void
  onRemoveBible: (version: string) => void
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

function Scriptures({ onAdd, onShowNow, versions, version, onVersion, onAddBible, onRemoveBible }: { onAdd: (item: ScheduleItem) => void; onShowNow: (item: ScheduleItem) => void } & BiblePickerProps): React.JSX.Element {
  const [text, setText] = useState('Romans 8:35-39')
  const ref = parseReference(text)
  const current = versions.find((v) => v.version === version)
  const result = ref ? lookupPassage(ref, version) : null
  let note = 'Type a reference, for example John 3:16 or Psalm 23:1-6.'
  if (text.trim() !== '') {
    if (!ref) note = 'That reference was not recognised.'
    else if (!result) note = `${formatReference(ref)} was not found in ${current?.name ?? version}.`
    else note = `${result.reference}: ${result.verses.length} verse${result.verses.length === 1 ? '' : 's'}`
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
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && result) onShowNow(itemFromScripture(result))
          }}
          placeholder="Book chapter:verse, then Enter to show it now"
          aria-label="Scripture reference"
        />
      </label>
      <div className="scripture-result">
        <span className={result ? '' : 'muted'}>{note}</span>
        <span className="scripture-actions">
          <button className="btn small go-live" disabled={!result} onClick={() => result && onShowNow(itemFromScripture(result))}>
            <IconPlayerPlayFilled size={14} /> Show now
          </button>
          <button className="btn small" disabled={!result} onClick={() => result && onAdd(itemFromScripture(result))}>
            <IconPlus size={14} /> Add to schedule
          </button>
        </span>
      </div>
    </div>
  )
}

import { IconArrowsMaximize, IconArrowsMinimize, IconPlayerPlayFilled, IconPlus, IconSearch } from '@tabler/icons-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  chapterCountFor,
  completeBook,
  formatReference,
  lookupPassage,
  parseReference,
  searchVerses
} from '../../shared/bible'
import { itemFromScripture } from '../../shared/schedule'
import type { TrayTab } from '../../shared/state'
import type { BibleSummary, OutputState, ScheduleItem, Slide } from '../../shared/types'
import { MediaTab } from './MediaTab'
import { Songs } from './Songs'

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
  expanded: boolean
  onToggleExpanded: () => void
  tab: TrayTab
  onTab: (tab: TrayTab) => void
  onAdd: (item: ScheduleItem) => void
  /** Puts an item on the screen straight away, starting at the given slide. */
  onShowNow: (item: ScheduleItem, index?: number) => void
  media: React.ComponentProps<typeof MediaTab>
  /** Builds what a slide looks like on the screen (theme and background), for the song editor preview. */
  songPreview: (slide: Slide) => OutputState
  bibles: BiblePickerProps
}

export function Tray({ expanded, onToggleExpanded, tab, onTab, onAdd, onShowNow, media, bibles, songPreview }: Props): React.JSX.Element {
  return (
    <section className="tray">
      <nav className="tray-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tab} className={`tab${t.id === tab ? ' active' : ''}`} onClick={() => onTab(t.id)}>
            {t.label}
          </button>
        ))}
        <button className="btn small tray-enlarge" onClick={onToggleExpanded} aria-pressed={expanded} title={expanded ? 'Shrink (Esc)' : 'Enlarge'}>
          {expanded ? <IconArrowsMinimize size={14} /> : <IconArrowsMaximize size={14} />}
          {expanded ? 'Shrink' : 'Enlarge'}
        </button>
      </nav>
      <div className="tray-body">
        {tab === 'songs' && <Songs onAdd={onAdd} onShowNow={onShowNow} preview={songPreview} />}
        {tab === 'scriptures' && <Scriptures onAdd={onAdd} onShowNow={onShowNow} {...bibles} />}
        {tab === 'media' && <MediaTab {...media} />}
        {tab === 'themes' && <p className="empty">Themes come in a later milestone: fonts, backgrounds and church logo.</p>}
      </div>
    </section>
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
  // EasyWorship-style picking: book (completes itself), then chapter, then verse.
  const [typed, setTyped] = useState('')
  const [chapterText, setChapterText] = useState('')
  const [verseText, setVerseText] = useState('')
  const [skipComplete, setSkipComplete] = useState(false)
  // Free typing: a whole reference ("John 3:16") or words from a verse.
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<number | null>(null)

  const bookRef = useRef<HTMLInputElement>(null)
  const chapterRef = useRef<HTMLInputElement>(null)
  const verseRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const current = versions.find((v) => v.version === version)
  const completion = useMemo(() => (skipComplete ? null : completeBook(typed, version)), [typed, version, skipComplete])
  const bookShown = completion && completion.label.toLowerCase().replace(/\s/g, '').startsWith(typed.toLowerCase().replace(/\s/g, '')) ? completion.label : typed
  const book = completeBook(typed, version)?.book ?? null

  // Keep the completed part of the book name selected so the next letter replaces it.
  useLayoutEffect(() => {
    const el = bookRef.current
    if (!el || document.activeElement !== el || bookShown.length <= typed.length) return
    // Select the part of the name that was filled in (names like "1 John" contain a space).
    let need = typed.replace(/[^A-Za-z0-9]/g, '').length
    let start = 0
    while (start < bookShown.length && need > 0) {
      if (/[A-Za-z0-9]/.test(bookShown[start])) need--
      start++
    }
    el.setSelectionRange(start, bookShown.length)
  }, [bookShown, typed])

  const chapter = parseInt(chapterText, 10)
  const verseNumber = parseInt(verseText, 10)
  const freeRef = useMemo(() => (text.trim() !== '' ? parseReference(text) : null), [text])
  const structuredRef = book && chapter > 0 ? { book, chapter } : null
  const ref = text.trim() !== '' ? freeRef : structuredRef
  const result = useMemo(() => (ref ? lookupPassage(ref, version) : null), [ref, version])
  const hits = useMemo(() => (text.trim() !== '' && !freeRef ? searchVerses(text, version) : []), [text, freeRef, version])

  // The verse typed in the verse box (or in a typed reference) is the one that is highlighted.
  const wanted = text.trim() !== '' ? freeRef?.verseStart : verseNumber > 0 ? verseNumber : undefined
  const wantedIndex = result && wanted !== undefined ? result.verses.findIndex((v) => v.verse === wanted) : -1
  const selected = picked ?? (wantedIndex >= 0 ? wantedIndex : 0)

  useEffect(() => {
    listRef.current?.querySelector('.picked')?.scrollIntoView({ block: 'nearest' })
  }, [selected, result])

  function show(index = selected): void {
    if (!result) return
    // A typed range such as 14-17 shows just that range; otherwise the whole chapter from the chosen verse.
    const whole = lookupPassage({ book: result.book, chapter: result.chapter }, version)
    const target = result.verses[index]
    const at = whole && target ? Math.max(whole.verses.findIndex((v) => v.verse === target.verse), 0) : 0
    onShowNow(itemFromScripture(whole ?? result), at)
  }

  function showHit(hitBook: string, hitChapter: number, verse: number): void {
    const chapterResult = lookupPassage({ book: hitBook, chapter: hitChapter }, version)
    if (!chapterResult) return
    const index = chapterResult.verses.findIndex((v) => v.verse === verse)
    onShowNow(itemFromScripture(chapterResult), Math.max(index, 0))
  }

  function useFields(): void {
    setText('')
    setPicked(null)
  }

  function onBookChange(e: React.ChangeEvent<HTMLInputElement>): void {
    useFields()
    const inputType = (e.nativeEvent as InputEvent).inputType ?? ''
    // Deleting removes the completion first, without it jumping straight back.
    setSkipComplete(inputType.startsWith('delete'))
    const value = e.target.value
    // A digit after a name moves on to the chapter: "John" then "3".
    const m = /^(.*[A-Za-z])\s*(\d)$/.exec(value)
    if (m) {
      setTyped(m[1])
      setSkipComplete(false)
      setChapterText(m[2])
      setVerseText('')
      chapterRef.current?.focus()
      return
    }
    setTyped(value)
    setChapterText('')
    setVerseText('')
  }

  function onFieldKey(e: React.KeyboardEvent<HTMLInputElement>, field: 'book' | 'chapter' | 'verse'): void {
    const input = e.currentTarget
    const atEnd = input.selectionStart === input.value.length || input.selectionStart !== input.selectionEnd
    if (e.key === 'Enter') {
      if (result) show()
    } else if (e.key.toLowerCase() === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd && result) {
      e.preventDefault()
      show()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // Right (or left) moves on to the next box: book -> chapter -> verse.
      if (field === 'book' && book && (atEnd || e.key === 'ArrowLeft')) {
        e.preventDefault()
        chapterRef.current?.focus()
      } else if (field === 'chapter' && chapterText !== '' && (atEnd || e.key === 'ArrowLeft')) {
        e.preventDefault()
        verseRef.current?.focus()
      } else if (field === 'verse' && e.key === 'ArrowLeft') {
        e.preventDefault()
        chapterRef.current?.focus()
      }
    } else if ((e.key === ':' || e.key === '.' || e.key === ' ') && field === 'chapter' && chapterText !== '') {
      e.preventDefault()
      verseRef.current?.focus()
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && result) {
      // Up and down step through the verses; the verse box follows.
      e.preventDefault()
      const next = Math.min(Math.max(selected + (e.key === 'ArrowDown' ? 1 : -1), 0), result.verses.length - 1)
      setPicked(next)
      if (text.trim() === '') setVerseText(String(result.verses[next].verse))
    } else if (e.key === 'Backspace' && input.value === '') {
      if (field === 'verse') chapterRef.current?.focus()
      else if (field === 'chapter') bookRef.current?.focus()
    }
  }

  const maxChapter = book ? chapterCountFor(book, version) : 0
  let note = 'Type the first letters of a book, then the chapter, then the verse. Enter shows it.'
  if (text.trim() !== '') {
    if (freeRef && !result) note = `${formatReference(freeRef)} was not found in ${current?.name ?? version}.`
    else if (result) note = `${result.reference}: ${result.verses.length} verse${result.verses.length === 1 ? '' : 's'}.`
    else if (hits.length > 0) note = `${hits.length}${hits.length === 30 ? '+' : ''} verse${hits.length === 1 ? '' : 's'} match. Double-click one to show it.`
    else note = 'No verse matches. Check the spelling, or type a reference such as John 3:16.'
  } else if (book && chapterText !== '' && !result) {
    note = `${completion?.label ?? typed} ${maxChapter > 0 ? `has ${maxChapter} chapters in ${version}` : 'is not in this Bible'}.`
  } else if (result) {
    note = `${result.reference}: ${result.verses.length} verses. Enter or double-click shows verse ${result.verses[selected]?.verse ?? 1}.`
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
        <label>
          Book
          <input
            ref={bookRef}
            className="pick book"
            value={bookShown}
            onChange={onBookChange}
            onKeyDown={(e) => onFieldKey(e, 'book')}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="Gen"
            aria-label="Book"
            autoComplete="off"
            autoFocus
          />
        </label>
        <label>
          Chapter
          <input
            ref={chapterRef}
            className="pick num"
            value={chapterText}
            inputMode="numeric"
            onChange={(e) => {
              useFields()
              setChapterText(e.target.value.replace(/\D/g, '').slice(0, 3))
              setVerseText('')
            }}
            onKeyDown={(e) => onFieldKey(e, 'chapter')}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="1"
            aria-label="Chapter"
            autoComplete="off"
          />
        </label>
        <label>
          Verse
          <input
            ref={verseRef}
            className="pick num"
            value={verseText}
            inputMode="numeric"
            onChange={(e) => {
              useFields()
              setVerseText(e.target.value.replace(/\D/g, '').slice(0, 3))
            }}
            onKeyDown={(e) => onFieldKey(e, 'verse')}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="1"
            aria-label="Verse"
            autoComplete="off"
          />
        </label>
        <label className="grow">
          Or type a reference / words from a verse
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setPicked(null)
            }}
            onKeyDown={(e) => {
              const input = e.currentTarget
              if (e.key === 'Enter' && result) show()
              else if (e.key.toLowerCase() === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd && result) {
                e.preventDefault()
                show()
              }
            }}
            placeholder="John 3:16 or for god so loved"
            aria-label="Scripture reference"
            autoComplete="off"
          />
        </label>
        <button className="btn small" onClick={onAddBible}>Add a Bible…</button>
        {version !== 'KJV' && <button className="btn small" onClick={() => onRemoveBible(version)}>Remove {version}</button>}
      </div>
      <div className="scripture-result">
        <span className={result || hits.length > 0 ? '' : 'muted'}>{note}</span>
        <span className="scripture-actions">
          <button className="btn small go-live" disabled={!result} onClick={() => show()}>
            <IconPlayerPlayFilled size={14} /> Show now
          </button>
          <button className="btn small" disabled={!result} onClick={() => result && onAdd(itemFromScripture(result))}>
            <IconPlus size={14} /> Add to schedule
          </button>
        </span>
      </div>

      {result && (
        <ul className="verse-list" aria-label="Verses" ref={listRef}>
          {result.verses.map((v, i) => (
            <li
              key={v.verse}
              className={`verse-row${selected === i ? ' picked' : ''}`}
              onClick={() => {
                setPicked(i)
                if (text.trim() === '') setVerseText(String(v.verse))
              }}
              onDoubleClick={() => show(i)}
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

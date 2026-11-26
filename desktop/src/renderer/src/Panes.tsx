import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconPlus,
  IconBook,
  IconInfoCircle,
  IconMusic,
  IconPhoto,
  IconSpeakerphone,
  IconCoin,
  IconTrash,
  IconVideo
} from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_DIM, type ItemType, type OutputBackground, type OutputState, type ScheduleItem, type Segment, type Slide, type SlotHint, type Theme } from '../../shared/types'
import { stripMarkup } from '../../shared/markup'
import { groupItems, openSlots, slotLabel } from '../../shared/plan'
import { DEFAULT_STYLE, type DisplayStyle } from '../../shared/style'
import { SlideView } from './SlideView'

const TYPE_ICONS: Record<ItemType, typeof IconMusic> = {
  info: IconInfoCircle,
  song: IconMusic,
  scripture: IconBook,
  announcement: IconSpeakerphone,
  offering: IconCoin,
  video: IconVideo,
  image: IconPhoto
}

function slideOutput(slide: Slide | null, theme: Theme, background: OutputBackground | null = null, dim = DEFAULT_DIM, style: DisplayStyle = DEFAULT_STYLE): OutputState {
  return { mode: slide ? 'slide' : 'clear', slide, theme, alert: null, background, dim, style }
}

interface ScheduleProps {
  name: string
  items: ScheduleItem[]
  segments: Segment[]
  activeSegmentId: string | null
  selectedId: string | null
  liveId: string | null
  backgroundMissingIds: ReadonlySet<string>
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onMove: (id: string, delta: number) => void
  onAddSegment: (name: string) => void
  onRenameSegment: (id: string, name: string) => void
  onRemoveSegment: (id: string) => void
  onMoveSegment: (id: string, delta: number) => void
  onActivate: (id: string | null) => void
  fillSlotId: string | null
  onAddSlot: (hint: SlotHint) => void
  onNewWeek: () => void
}

export function SchedulePane(props: ScheduleProps): React.JSX.Element {
  const { name, items, segments, activeSegmentId, selectedId, liveId, backgroundMissingIds } = props
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmWeek, setConfirmWeek] = useState(false)
  const open = openSlots(items)
  const groups = groupItems(items, segments)
  let number = 0

  function addSegment(): void {
    if (newName.trim() !== '') props.onAddSegment(newName)
    setNewName('')
    setAdding(false)
  }

  return (
    <section className="pane schedule">
      <header className="pane-head">
        <h2>Schedule</h2>
        <span className="muted">{open > 0 ? `${open} still to choose` : name}</span>
      </header>
      <ol className="schedule-list">
        {items.length === 0 && segments.length === 0 && <li className="empty">Add songs and scriptures from the tray below, or add a segment to plan the service.</li>}
        {groups.map((group) => {
          const seg = group.segment
          return (
            <li key={seg?.id ?? 'loose'} className="seg-group">
              {seg && (
                <div className={`seg-head${activeSegmentId === seg.id ? ' active' : ''}`} onClick={() => props.onActivate(seg.id)} title="New items are added here">
                  {renaming?.id === seg.id ? (
                    <input
                      className="seg-input"
                      value={renaming.name}
                      maxLength={60}
                      autoFocus
                      aria-label="Segment name"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenaming({ id: seg.id, name: e.target.value })}
                      onBlur={() => setRenaming(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          props.onRenameSegment(seg.id, renaming.name)
                          setRenaming(null)
                        } else if (e.key === 'Escape') setRenaming(null)
                      }}
                    />
                  ) : (
                    <span className="seg-name">{seg.name}</span>
                  )}
                  {activeSegmentId === seg.id && <span className="seg-here">adding here</span>}
                  <span className="seg-tools" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" aria-label={`Move ${seg.name} up`} onClick={() => props.onMoveSegment(seg.id, -1)}><IconChevronUp size={14} /></button>
                    <button className="icon-btn" aria-label={`Move ${seg.name} down`} onClick={() => props.onMoveSegment(seg.id, 1)}><IconChevronDown size={14} /></button>
                    <button className="icon-btn" aria-label={`Rename ${seg.name}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setRenaming({ id: seg.id, name: seg.name })}><IconPencil size={14} /></button>
                    {confirmId === seg.id ? (
                      <button className="btn small danger" onClick={() => { props.onRemoveSegment(seg.id); setConfirmId(null) }} onBlur={() => setConfirmId(null)} autoFocus>
                        {group.items.length > 0 ? 'Remove heading?' : 'Remove?'}
                      </button>
                    ) : (
                      <button className="icon-btn" aria-label={`Remove ${seg.name}`} onClick={() => setConfirmId(seg.id)}><IconTrash size={14} /></button>
                    )}
                  </span>
                </div>
              )}
              {!seg && segments.length > 0 && <div className="seg-head loose" onClick={() => props.onActivate(null)}><span className="seg-name">Not in a segment</span>{activeSegmentId === null && <span className="seg-here">adding here</span>}</div>}
              <ol className="seg-items">
                {group.items.map((item) => {
                  number += 1
                  const Icon = TYPE_ICONS[item.type]
                  const selected = item.id === selectedId
                  const live = item.id === liveId
                  return (
                    <li key={item.id} className={`schedule-row${selected ? ' selected' : ''}${live ? ' is-live' : ''}${item.slot ? ' slot' : ''}${props.fillSlotId === item.id ? ' filling' : ''}`} onClick={() => props.onSelect(item.id)}>
                      <span className="row-num">{number}</span>
                      <Icon size={18} className={`row-icon type-${item.type}`} />
                      <span className="row-title">{item.slot ? `${item.title}: choose one` : item.title}</span>
                      {(item.status === 'missing' || backgroundMissingIds.has(item.id)) && (
                        <span className="row-warn" title={item.status === 'missing' ? 'Media file missing' : 'Background file missing'}>
                          <IconAlertTriangle size={16} />
                        </span>
                      )}
                      {live && <span className="row-live">LIVE</span>}
                      <span className="row-tools" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" aria-label={`Move ${item.title} up`} onClick={() => props.onMove(item.id, -1)}><IconChevronUp size={14} /></button>
                        <button className="icon-btn" aria-label={`Move ${item.title} down`} onClick={() => props.onMove(item.id, 1)}><IconChevronDown size={14} /></button>
                        <button className="icon-btn row-remove" aria-label={`Remove ${item.title}`} onClick={() => props.onRemove(item.id)}><IconTrash size={16} /></button>
                      </span>
                    </li>
                  )
                })}
              </ol>
            </li>
          )
        })}
      </ol>
      <div className="seg-add">
        <select className="mini" value="" aria-label="Add a blank spot" onChange={(e) => { if (e.target.value) props.onAddSlot(e.target.value as SlotHint) }}>
          <option value="">Add a blank spot…</option>
          {(['song', 'scripture', 'program'] as const).map((h) => (
            <option key={h} value={h}>{slotLabel(h)}</option>
          ))}
        </select>
        {confirmWeek ? (
          <button className="btn small danger" autoFocus onBlur={() => setConfirmWeek(false)} onClick={() => { props.onNewWeek(); setConfirmWeek(false) }}>
            Clear songs and scriptures?
          </button>
        ) : (
          <button className="btn small" onClick={() => setConfirmWeek(true)} title="Keep the plan, empty the songs, scriptures and program entries">
            New week
          </button>
        )}
        {adding ? (
          <input
            className="seg-input"
            value={newName}
            maxLength={60}
            autoFocus
            placeholder="e.g. Morning Prayers. Enter adds it."
            aria-label="New segment name"
            onChange={(e) => setNewName(e.target.value)}
            onBlur={addSegment}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addSegment()
              else if (e.key === 'Escape') {
                setNewName('')
                setAdding(false)
              }
            }}
          />
        ) : (
          <button className="btn small" onClick={() => setAdding(true)}>
            <IconPlus size={14} /> Add segment
          </button>
        )}
      </div>
    </section>
  )
}

interface PreviewProps {
  item: ScheduleItem | null
  index: number
  outputTheme: Theme
  background: OutputBackground | null
  dim: number
  style: DisplayStyle
  onSelectSlide: (index: number) => void
  onGoLive: () => void
}

export function PreviewPane({ item, index, outputTheme, background, dim, style, onSelectSlide, onGoLive }: PreviewProps): React.JSX.Element {
  const slide = item?.slides[index] ?? null
  return (
    <section className="pane preview">
      <header className="pane-head">
        <h2>Preview</h2>
        <span className="muted">{item ? item.title : 'Nothing selected'}</span>
      </header>
      <div className="screen-frame">
        <SlideView output={slideOutput(slide, outputTheme, background, dim, style)} />
      </div>
      <div className="thumbs">
        {item?.slides.map((s, i) => (
          <button
            key={s.id}
            className={`thumb kind-${s.kind}${i === index ? ' selected' : ''}`}
            onClick={() => onSelectSlide(i)}
            onDoubleClick={() => {
              onSelectSlide(i)
              onGoLive()
            }}
          >
            <div className="thumb-screen">
              <SlideView output={slideOutput(s, outputTheme, background, dim, style)} compact />
            </div>
            <span className="thumb-label">{s.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

interface LiveProps {
  title: string | null
  slides: Slide[]
  index: number
  output: OutputState
  onGoto: (index: number) => void
}

export function LivePane({ title, slides, index, output, onGoto }: LiveProps): React.JSX.Element {
  const isLive = title !== null && output.mode === 'slide'
  const listRef = useRef<HTMLUListElement>(null)
  // Keep the current screen in view as the arrow keys move through a long list.
  useEffect(() => {
    listRef.current?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' })
  }, [index, slides])
  return (
    <section className="pane live">
      <header className="pane-head">
        <h2>Live</h2>
        <span className={`live-badge${isLive ? ' on' : ''}`}>{isLive ? 'LIVE' : output.mode.toUpperCase()}</span>
      </header>
      <div className="screen-frame live-frame">
        <SlideView output={output} animate />
      </div>
      <div className="live-title">{title ?? 'Nothing live'}</div>
      <ul className="live-sections" ref={listRef}>
        {slides.map((s, i) => (
          <li key={s.id}>
            <button className={`section-btn kind-${s.kind}${i === index ? ' selected' : ''}`} onClick={() => onGoto(i)}>
              <span className="section-label">{s.label}</span>
              <span className="section-text">{stripMarkup(s.lines.join(" / "))}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

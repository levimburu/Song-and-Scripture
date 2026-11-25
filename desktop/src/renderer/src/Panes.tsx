import {
  IconAlertTriangle,
  IconBook,
  IconInfoCircle,
  IconMusic,
  IconSpeakerphone,
  IconCoin,
  IconTrash,
  IconVideo
} from '@tabler/icons-react'
import { DEFAULT_DIM, type ItemType, type OutputBackground, type OutputState, type ScheduleItem, type Slide, type Theme } from '../../shared/types'
import { SlideView } from './SlideView'

const TYPE_ICONS: Record<ItemType, typeof IconMusic> = {
  info: IconInfoCircle,
  song: IconMusic,
  scripture: IconBook,
  announcement: IconSpeakerphone,
  offering: IconCoin,
  video: IconVideo
}

function slideOutput(slide: Slide | null, theme: Theme, background: OutputBackground | null = null, dim = DEFAULT_DIM): OutputState {
  return { mode: slide ? 'slide' : 'clear', slide, theme, alert: null, background, dim }
}

interface ScheduleProps {
  name: string
  items: ScheduleItem[]
  selectedId: string | null
  liveId: string | null
  backgroundMissingIds: ReadonlySet<string>
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export function SchedulePane({ name, items, selectedId, liveId, backgroundMissingIds, onSelect, onRemove }: ScheduleProps): React.JSX.Element {
  return (
    <section className="pane schedule">
      <header className="pane-head">
        <h2>Schedule</h2>
        <span className="muted">{name}</span>
      </header>
      <ol className="schedule-list">
        {items.length === 0 && <li className="empty">Add songs and scriptures from the tray below.</li>}
        {items.map((item, i) => {
          const Icon = TYPE_ICONS[item.type]
          const selected = item.id === selectedId
          const live = item.id === liveId
          return (
            <li
              key={item.id}
              className={`schedule-row${selected ? ' selected' : ''}${live ? ' is-live' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span className="row-num">{i + 1}</span>
              <Icon size={18} className={`row-icon type-${item.type}`} />
              <span className="row-title">{item.title}</span>
              {(item.status === 'missing' || backgroundMissingIds.has(item.id)) && (
                <span className="row-warn" title={item.status === 'missing' ? 'Media file missing' : 'Background file missing'}>
                  <IconAlertTriangle size={16} />
                </span>
              )}
              {live && <span className="row-live">LIVE</span>}
              <button
                className="icon-btn row-remove"
                aria-label={`Remove ${item.title}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(item.id)
                }}
              >
                <IconTrash size={16} />
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

interface PreviewProps {
  item: ScheduleItem | null
  index: number
  outputTheme: Theme
  background: OutputBackground | null
  dim: number
  onSelectSlide: (index: number) => void
  onGoLive: () => void
}

export function PreviewPane({ item, index, outputTheme, background, dim, onSelectSlide, onGoLive }: PreviewProps): React.JSX.Element {
  const slide = item?.slides[index] ?? null
  return (
    <section className="pane preview">
      <header className="pane-head">
        <h2>Preview</h2>
        <span className="muted">{item ? item.title : 'Nothing selected'}</span>
      </header>
      <div className="screen-frame">
        <SlideView output={slideOutput(slide, outputTheme, background, dim)} />
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
              <SlideView output={slideOutput(s, outputTheme, background, dim)} compact />
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
      <ul className="live-sections">
        {slides.map((s, i) => (
          <li key={s.id}>
            <button className={`section-btn kind-${s.kind}${i === index ? ' selected' : ''}`} onClick={() => onGoto(i)}>
              <span className="section-label">{s.label}</span>
              <span className="section-text">{s.lines[0]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

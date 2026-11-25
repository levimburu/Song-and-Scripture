import { IconPhotoPlus, IconPlayerPlayFilled, IconPlus, IconTrash, IconVideo } from '@tabler/icons-react'
import { useState } from 'react'
import { LARGE_VIDEO_BYTES, mediaUrl } from '../../shared/media'
import type { MediaFile, MediaKind } from '../../shared/types'

interface Props {
  media: MediaFile[]
  onAdd: () => void
  onRemove: (id: string) => void
  /** Shows the photo or video full screen straight away. */
  onShow: (file: MediaFile) => void
  /** Puts it in the schedule to show later. */
  onSchedule: (file: MediaFile) => void
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** The library of photos and videos kept for the service: posters, clips and backgrounds. */
export function MediaTab({ media, onAdd, onRemove, onShow, onSchedule }: Props): React.JSX.Element {
  const [kind, setKind] = useState<MediaKind | 'all'>('all')
  const shown = media.filter((m) => kind === 'all' || m.kind === kind)
  return (
    <div>
      <div className="media-top">
        <button className="btn small primary" onClick={onAdd}>
          <IconPhotoPlus size={16} /> Add photos or videos
        </button>
        <div className="seg" role="group" aria-label="Show">
          {(['all', 'image', 'video'] as const).map((k) => (
            <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
              {k === 'all' ? 'All' : k === 'image' ? 'Photos' : 'Videos'}
            </button>
          ))}
        </div>
        <span className="muted">Backgrounds are chosen with the Background button at the top.</span>
      </div>
      {media.length === 0 && <p className="empty">No photos or videos yet. Add posters, photos or clips to show during the service.</p>}
      <div className="media-grid">
        {shown.map((m) => {
          const url = mediaUrl(m.file)
          const large = m.kind === 'video' && m.size > LARGE_VIDEO_BYTES
          return (
            <div key={m.id} className="media-card">
              <div className="media-thumb">
                {m.kind === 'image' ? <img src={url} alt={m.name} /> : <video src={url} muted preload="metadata" />}
                {m.kind === 'video' && <span className="media-tag kind"><IconVideo size={10} /> VIDEO</span>}
              </div>
              <div className="media-meta" title={m.name}>{m.name}</div>
              <div className={`media-size${large ? ' warn' : ''}`}>
                {formatSize(m.size)}{large ? ' · large, may stutter' : ''}
              </div>
              <div className="media-actions">
                <button className="btn small" onClick={() => onShow(m)} title="Show full screen now">
                  <IconPlayerPlayFilled size={14} /> Show
                </button>
                <button className="btn small" onClick={() => onSchedule(m)} title="Add to the schedule">
                  <IconPlus size={14} /> Schedule
                </button>
                <button className="icon-btn" aria-label={`Delete ${m.name}`} onClick={() => onRemove(m.id)}><IconTrash size={16} /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

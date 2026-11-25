import { IconPhotoPlus, IconTrash, IconVideo } from '@tabler/icons-react'
import { LARGE_VIDEO_BYTES, mediaUrl } from '../../shared/media'
import type { MediaFile } from '../../shared/types'

interface Props {
  media: MediaFile[]
  itemTitle: string | null
  /** undefined = follows the service default, null = none, string = media id */
  itemBackground: string | null | undefined
  defaultBackground: string | null
  dim: number
  onAdd: () => void
  onRemove: (id: string) => void
  onSetItem: (background: string | null | undefined) => void
  onSetDefault: (mediaId: string | null) => void
  onDim: (dim: number) => void
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function MediaTab(props: Props): React.JSX.Element {
  const { media, itemTitle, itemBackground, defaultBackground, dim } = props
  const nameOf = (id: string | null): string => {
    if (id === null) return 'None'
    return media.find((m) => m.id === id)?.name ?? 'Missing file'
  }
  const itemLabel = itemBackground === undefined ? `Service default (${nameOf(defaultBackground)})` : nameOf(itemBackground)

  return (
    <div>
      <div className="media-top">
        <button className="btn small primary" onClick={props.onAdd}>
          <IconPhotoPlus size={16} /> Add photos or videos
        </button>
        <label>
          Darken background
          <input type="range" min={0} max={90} value={dim} onChange={(e) => props.onDim(Number(e.target.value))} aria-label="Darken background" />
          <span>{dim}%</span>
        </label>
      </div>
      <div className="media-status">
        <div>
          Service default: <b>{nameOf(defaultBackground)}</b>
          <button className="btn small" disabled={defaultBackground === null} onClick={() => props.onSetDefault(null)}>Clear</button>
        </div>
        <div>
          Selected item{itemTitle ? ` (${itemTitle})` : ''}: <b>{itemTitle ? itemLabel : 'Nothing selected'}</b>
          <button className="btn small" disabled={!itemTitle || itemBackground === undefined} onClick={() => props.onSetItem(undefined)}>Use default</button>
          <button className="btn small" disabled={!itemTitle || itemBackground === null} onClick={() => props.onSetItem(null)}>No background</button>
        </div>
      </div>
      {media.length === 0 && <p className="empty">No photos or videos yet. Add some to use them behind verses and lyrics.</p>}
      <div className="media-grid">
        {media.map((m) => {
          const url = mediaUrl(m.file)
          const large = m.kind === 'video' && m.size > LARGE_VIDEO_BYTES
          return (
            <div key={m.id} className={`media-card${itemBackground === m.id ? ' used-item' : ''}`}>
              <div className="media-thumb">
                {m.kind === 'image' ? <img src={url} alt={m.name} /> : <video src={url} muted preload="metadata" />}
                {defaultBackground === m.id && <span className="media-tag">DEFAULT</span>}
                {m.kind === 'video' && <span className="media-tag kind"><IconVideo size={10} /> VIDEO</span>}
              </div>
              <div className="media-meta" title={m.name}>{m.name}</div>
              <div className={`media-size${large ? ' warn' : ''}`}>
                {formatSize(m.size)}{large ? ' · large, may stutter' : ''}
              </div>
              <div className="media-actions">
                <button className="btn small" disabled={!itemTitle} onClick={() => props.onSetItem(m.id)}>This item</button>
                <button className="btn small" onClick={() => props.onSetDefault(m.id)}>Default</button>
                <button className="icon-btn" aria-label={`Delete ${m.name}`} onClick={() => props.onRemove(m.id)}><IconTrash size={16} /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

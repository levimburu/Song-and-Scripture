import { IconBan, IconPhoto, IconPhotoPlus, IconVideo } from '@tabler/icons-react'
import { useState } from 'react'
import { mediaUrl } from '../../shared/media'
import type { MediaFile, MediaKind } from '../../shared/types'

interface PickerProps {
  media: MediaFile[]
  /** undefined = follows the service background, null = none, string = a media id. */
  value: string | null | undefined
  onChange: (value: string | null | undefined) => void
  onAdd: () => void
  /** When set, a first tile with this label means "use the service background". */
  inheritLabel?: string
}

/** Pictures and Videos tabs with thumbnails to click. Used in the toolbar and the song editor. */
export function BackgroundPicker({ media, value, onChange, onAdd, inheritLabel }: PickerProps): React.JSX.Element {
  const current = media.find((m) => m.id === value)
  const [kind, setKind] = useState<MediaKind>(current?.kind ?? 'image')
  const shown = media.filter((m) => m.kind === kind)
  const missing = typeof value === 'string' && !current

  return (
    <div className="bgp">
      <div className="bgp-head">
        <div className="seg" role="tablist" aria-label="Background type">
          <button role="tab" aria-selected={kind === 'image'} className={kind === 'image' ? 'active' : ''} onClick={() => setKind('image')}>
            <IconPhoto size={14} /> Pictures
          </button>
          <button role="tab" aria-selected={kind === 'video'} className={kind === 'video' ? 'active' : ''} onClick={() => setKind('video')}>
            <IconVideo size={14} /> Videos
          </button>
        </div>
        <button className="btn small" onClick={onAdd}>
          <IconPhotoPlus size={14} /> Add
        </button>
      </div>
      <div className="bgp-grid">
        {inheritLabel !== undefined && (
          <button className={`bgp-tile text${value === undefined ? ' on' : ''}`} onClick={() => onChange(undefined)} aria-pressed={value === undefined}>
            {inheritLabel}
          </button>
        )}
        <button className={`bgp-tile text${value === null ? ' on' : ''}`} onClick={() => onChange(null)} aria-pressed={value === null}>
          <IconBan size={16} /> None
        </button>
        {shown.map((m) => (
          <button key={m.id} className={`bgp-tile${value === m.id ? ' on' : ''}`} onClick={() => onChange(m.id)} aria-pressed={value === m.id} title={m.name}>
            {m.kind === 'image' ? <img src={mediaUrl(m.file)} alt={m.name} /> : <video src={mediaUrl(m.file)} muted preload="metadata" />}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="muted bgp-empty">No {kind === 'image' ? 'pictures' : 'videos'} yet. Press Add to bring some in.</p>}
      {missing && <p className="muted bgp-empty">The file chosen earlier is no longer in the library.</p>}
    </div>
  )
}

interface MenuProps {
  media: MediaFile[]
  serviceBackground: string | null
  itemTitle: string | null
  itemBackground: string | null | undefined
  dim: number
  onAdd: () => void
  onService: (id: string | null) => void
  onItem: (value: string | null | undefined) => void
  onDim: (dim: number) => void
}

/** The toolbar Background popover: the whole service, or just the selected item. */
export function BackgroundMenu(props: MenuProps): React.JSX.Element {
  const [scope, setScope] = useState<'service' | 'item'>('service')
  const forItem = scope === 'item' && props.itemTitle !== null
  return (
    <div className="popover bg-popover" role="dialog" aria-label="Background">
      <div className="seg" role="group" aria-label="Apply background to">
        <button className={!forItem ? 'active' : ''} onClick={() => setScope('service')}>Whole service</button>
        <button className={forItem ? 'active' : ''} disabled={props.itemTitle === null} onClick={() => setScope('item')} title={props.itemTitle ?? 'Select an item first'}>
          Selected item
        </button>
      </div>
      {forItem && <span className="muted">Only for: {props.itemTitle}</span>}
      {forItem ? (
        <BackgroundPicker media={props.media} value={props.itemBackground} onChange={props.onItem} onAdd={props.onAdd} inheritLabel="Same as service" />
      ) : (
        <BackgroundPicker media={props.media} value={props.serviceBackground} onChange={(v) => props.onService(v ?? null)} onAdd={props.onAdd} />
      )}
      <label className="bg-dim">
        Darken background
        <input type="range" min={0} max={90} value={props.dim} onChange={(e) => props.onDim(Number(e.target.value))} aria-label="Darken background" />
        <span>{props.dim}%</span>
      </label>
    </div>
  )
}

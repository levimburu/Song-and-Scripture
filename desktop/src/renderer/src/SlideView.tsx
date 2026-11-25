import { useLayoutEffect, useRef, useState } from 'react'
import type { OutputState } from '../../shared/types'

const W = 1920
const H = 1080
const MAX_FONT = 150
const MIN_FONT = 36

interface Props {
  output: OutputState
  /** Hide the alert banner (used for thumbnails). */
  compact?: boolean
}

// A 1920x1080 logical canvas scaled to fit its container, so the preview,
// live pane and real projector output all lay text out identically.
export function SlideView({ output, compact = false }: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const update = (): void => {
      const rect = host.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setScale(Math.min(rect.width / W, rect.height / H))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const slide = output.mode === 'slide' ? output.slide : null
  const lines = slide?.lines
  const isScripture = slide?.kind === 'scripture'

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || !lines) return
    let low = MIN_FONT
    let high = MAX_FONT
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      el.style.fontSize = `${mid}px`
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) low = mid
      else high = mid - 1
    }
    el.style.fontSize = `${low}px`
  }, [lines, isScripture])

  const palette = output.theme === 'light' ? 'screen-light' : 'screen-dark'
  const showBlack = output.mode === 'black'

  return (
    <div ref={hostRef} className="slide-host">
      <div
        className={`slide-canvas ${palette}${showBlack ? ' screen-black' : ''}`}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {output.mode === 'logo' && <div className="screen-logo">Song and Scripture</div>}
        {slide && (
          <div className="screen-content">
            <div
              ref={textRef}
              className={`screen-text ${isScripture ? 'screen-scripture' : 'screen-lyrics'}`}
            >
              {slide.lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {slide.reference && <div className="screen-reference">{slide.reference}</div>}
          </div>
        )}
        {!compact && output.alert && output.mode !== 'black' && (
          <div className="screen-alert">{output.alert}</div>
        )}
      </div>
    </div>
  )
}

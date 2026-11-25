import { useLayoutEffect, useRef, useState } from 'react'
import type { OutputState } from '../../shared/types'
import './fonts'

const W = 1920
const H = 1080
const MIN_FONT = 36

interface Props {
  output: OutputState
  /** Thumbnail mode: no alert banner, no video playback. */
  compact?: boolean
  /** Play video backgrounds. Only the live pane and the real output do this, to spare slow laptops. */
  animate?: boolean
}

// A 1920x1080 logical canvas scaled to fit its container, so the preview,
// live pane and real projector output all lay text out identically.
export function SlideView({ output, compact = false, animate = false }: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

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
  const style = output.style
  const textStyle = isScripture ? style.scripture : style.songs
  const ref = style.reference

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || !lines) return
    let low = MIN_FONT
    let high = Math.max(MIN_FONT, textStyle.maxSize)
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      el.style.fontSize = `${mid}px`
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) low = mid
      else high = mid - 1
    }
    el.style.fontSize = `${low}px`
  }, [lines, isScripture, textStyle.maxSize, textStyle.font, textStyle.bold])

  const bg =
    (output.mode === 'slide' || output.mode === 'clear') && output.background && output.background.url !== failedUrl
      ? output.background
      : null
  const palette = output.theme === 'light' ? 'screen-light' : 'screen-dark'
  const showBlack = output.mode === 'black'

  return (
    <div ref={hostRef} className="slide-host">
      <div
        className={`slide-canvas ${palette}${showBlack ? ' screen-black' : ''}${bg ? ' has-bg' : ''}`}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {bg && (
          <div className="screen-bg">
            {bg.kind === 'image' ? (
              <img src={bg.url} alt="" onError={() => setFailedUrl(bg.url)} />
            ) : compact ? null : (
              <video src={bg.url} autoPlay={animate} loop muted playsInline preload="metadata" onError={() => setFailedUrl(bg.url)} />
            )}
            <div className="screen-dim" style={{ opacity: output.dim / 100 }} />
          </div>
        )}
        {output.mode === 'logo' && <div className="screen-logo">Song and Scripture</div>}
        {slide && (
          <div
            className="screen-content"
            style={slide.reference && ref.show && ref.position === 'top' ? { padding: `${ref.size + 110}px 140px 90px` } : undefined}
          >
            <div
              ref={textRef}
              className={`screen-text ${isScripture ? 'screen-scripture' : 'screen-lyrics'}`}
              style={{
                fontFamily: `'${textStyle.font}', system-ui, sans-serif`,
                fontWeight: textStyle.bold ? 700 : 400,
                color: textStyle.color ?? undefined,
                textAlign: textStyle.align,
                alignItems: textStyle.align === 'left' ? 'flex-start' : textStyle.align === 'right' ? 'flex-end' : 'center',
                justifyContent: textStyle.valign === 'top' ? 'flex-start' : textStyle.valign === 'bottom' ? 'flex-end' : 'center',
                textShadow: textStyle.shadow ? '0 4px 14px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' : undefined
              }}
            >
              {slide.lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {slide.reference && ref.show && (
              <div
                className="screen-reference"
                style={{
                  [ref.position]: 40,
                  [ref.position === 'top' ? 'bottom' : 'top']: 'auto',
                  fontFamily: `'${ref.font}', system-ui, sans-serif`,
                  fontSize: ref.size,
                  fontWeight: ref.bold ? 700 : 400,
                  color: ref.color ?? undefined,
                  textAlign: ref.align,
                  padding: '0 140px',
                  textShadow: textStyle.shadow ? '0 3px 10px rgba(0,0,0,0.85)' : undefined
                }}
              >
                {slide.reference}
              </div>
            )}
          </div>
        )}
        {!compact && output.alert && output.mode !== 'black' && (
          <div className="screen-alert">{output.alert}</div>
        )}
      </div>
    </div>
  )
}

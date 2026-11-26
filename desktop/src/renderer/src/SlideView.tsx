import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { OutputState } from '../../shared/types'
import './fonts'
import { parseRuns } from '../../shared/markup'

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
  // Fonts load after the first paint. Fitting against the fallback font gives text that overflows once the real one arrives.
  const [fontTick, setFontTick] = useState(0)

  useEffect(() => {
    const bump = (): void => setFontTick((n) => n + 1)
    void document.fonts.ready.then(bump)
    document.fonts.addEventListener('loadingdone', bump)
    return () => document.fonts.removeEventListener('loadingdone', bump)
  }, [])

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
    const fits = (): boolean => {
      // Add up the lines instead of using scrollHeight: the text is centred, so overflow above the box is not counted there.
      let used = 0
      for (const child of Array.from(el.children)) used += (child as HTMLElement).offsetHeight
      return used <= el.clientHeight && el.scrollWidth <= el.clientWidth
    }
    const search = (from: number, to: number): number => {
      let low = from
      let high = Math.max(from, to)
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        el.style.fontSize = `${mid}px`
        if (fits()) low = mid
        else high = mid - 1
      }
      return low
    }
    const sized = lines.some((line) => parseRuns(line).some((run) => run.scale))
    // Plain text: fill the screen, one row per line.
    el.style.whiteSpace = ''
    el.style.setProperty('--zoom', '0')
    const base = search(MIN_FONT, textStyle.maxSize)
    if (sized) {
      // The operator made some words bigger, so they must really show bigger: start from the size the plain text
      // would have, apply their sizes on top, let long lines wrap, and shrink only if the screen would overflow.
      el.style.setProperty('--zoom', '1')
      el.style.whiteSpace = 'normal'
      el.style.fontSize = `${search(MIN_FONT, base)}px`
      return
    }
    el.style.fontSize = `${base}px`
  }, [lines, isScripture, textStyle.maxSize, textStyle.font, textStyle.bold, scale, fontTick, ref.show, ref.position, ref.size])

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
            style={slide.reference && ref.show ? { padding: ref.position === 'top' ? `${ref.size + 110}px 110px 90px` : `90px 110px ${ref.size + 110}px` } : undefined}
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
                <div key={i}>
                  {parseRuns(line).map((run, j) =>
                    run.color || run.scale || run.highlight || run.bold !== undefined || run.italic || run.underline || run.strike || run.outline || run.font ? (
                      <span
                        key={j}
                        style={{
                          color: run.color,
                          backgroundColor: run.highlight,
                          fontSize: run.scale ? `calc(1em + ${Math.round((run.scale - 1) * 100) / 100}em * var(--zoom, 1))` : undefined,
                          fontWeight: run.bold === undefined ? undefined : run.bold ? 700 : 400,
                          fontStyle: run.italic ? 'italic' : undefined,
                          fontFamily: run.font ? `'${run.font}', system-ui, sans-serif` : undefined,
                          textDecoration: [run.underline ? 'underline' : '', run.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined,
                          ...(run.outline ? ({ WebkitTextStroke: '0.04em #000', paintOrder: 'stroke fill' } as React.CSSProperties) : {})
                        }}
                      >
                        {run.text}
                      </span>
                    ) : (
                      run.text
                    )
                  )}
                </div>
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
                  padding: '0 110px',
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

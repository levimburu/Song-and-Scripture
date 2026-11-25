import {
  IconBell,
  IconEraser,
  IconMoon,
  IconPhoto,
  IconPlayerPlayFilled,
  IconScreenShare,
  IconSquareFilled,
  IconSun
} from '@tabler/icons-react'
import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  backgroundMissing,
  clampDim,
  createInitialState,
  deriveOutput,
  effectiveBackground,
  previewItem,
  reducer,
  resolveBackground,
  type Persisted
} from '../../shared/state'
import { isScheduleItems } from '../../shared/validate'
import type { DisplayInfo, OutputMode, Theme } from '../../shared/types'
import { installedVersions, registerBible, unregisterBible } from '../../shared/bible'
import type { BibleFileContents } from '../../shared/types'
import { isBibleText } from '../../shared/validate'
import { BibleImportDialog } from './BibleImportDialog'
import { LivePane, PreviewPane, SchedulePane } from './Panes'
import { Tray } from './Tray'

const STORAGE_KEY = 'sas.v1'

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light'
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const d = data as Record<string, unknown>
    if (typeof d.scheduleName !== 'string' || !isScheduleItems(d.items) || !isTheme(d.theme) || !isTheme(d.outputTheme)) return null
    return {
      scheduleName: d.scheduleName,
      items: d.items,
      theme: d.theme,
      outputTheme: d.outputTheme,
      defaultBackground: typeof d.defaultBackground === 'string' ? d.defaultBackground : null,
      dim: typeof d.bgDim === 'number' ? clampDim(d.bgDim) : undefined
    }
  } catch {
    return null
  }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
}

export function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState(loadPersisted()))
  const [display, setDisplay] = useState<DisplayInfo>({ count: 1, outputOpen: false, outputOnSecondary: false })
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertDraft, setAlertDraft] = useState('')
  const [versions, setVersions] = useState(installedVersions)
  const [bibleVersion, setBibleVersion] = useState('KJV')
  const [bibleFile, setBibleFile] = useState<BibleFileContents | null>(null)

  const output = useMemo(() => deriveOutput(state), [state])
  const item = previewItem(state)
  const previewBackground = resolveBackground(effectiveBackground(item, state.defaultBackground), state.media)
  const missingIds = useMemo(
    () => new Set(state.items.filter((it) => backgroundMissing(it, state)).map((it) => it.id)),
    [state.items, state.media, state.defaultBackground]
  )

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  useEffect(() => {
    window.api.setOutput(output)
  }, [output])

  useEffect(() => {
    try {
      const data: Persisted = {
        scheduleName: state.scheduleName,
        items: state.items,
        theme: state.theme,
        outputTheme: state.outputTheme,
        defaultBackground: state.defaultBackground,
        dim: state.dim
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, bgDim: data.dim, dim: undefined }))
    } catch {
      /* storage unavailable: autosave is best effort */
    }
  }, [state.scheduleName, state.items, state.theme, state.outputTheme, state.defaultBackground, state.dim])

  useEffect(() => {
    void window.api.listBibles().then((list) => {
      for (const bible of list) if (isBibleText(bible)) registerBible(bible)
      setVersions(installedVersions())
    })
  }, [])

  useEffect(() => {
    void window.api.listMedia().then((media) => dispatch({ type: 'setMedia', media }))
  }, [])

  useEffect(() => {
    void window.api.getDisplayInfo().then(setDisplay)
    return window.api.onDisplayInfo(setDisplay)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase()
      if (key === 'c' && event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isTyping(event.target) || (window.getSelection()?.toString() ?? '') !== '') return
        dispatch({ type: 'toggleLive' })
        event.preventDefault()
        return
      }
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      if (key === 'arrowright' || key === 'arrowdown' || key === ' ' || key === 'pagedown') dispatch({ type: 'liveStep', delta: 1 })
      else if (key === 'arrowleft' || key === 'arrowup' || key === 'pageup') dispatch({ type: 'liveStep', delta: -1 })
      else if (key === 'enter') dispatch({ type: 'goLive' })
      else if (key === 'b') dispatch({ type: 'setMode', mode: 'black' })
      else if (key === 'l') dispatch({ type: 'setMode', mode: 'logo' })
      else if (key === 'c') dispatch({ type: 'setMode', mode: 'clear' })
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const modeButton = (mode: OutputMode, label: string, icon: React.ReactNode): React.JSX.Element => (
    <button className={`btn${state.mode === mode ? ' active' : ''}`} aria-pressed={state.mode === mode} onClick={() => dispatch({ type: 'setMode', mode })}>
      {icon} {label}
    </button>
  )

  let projector = { cls: 'amber', text: 'Projector: output closed' }
  if (display.outputOpen && display.outputOnSecondary) projector = { cls: 'green', text: 'Projector connected' }
  else if (display.outputOpen) projector = { cls: 'amber', text: 'Output in a window (no second screen)' }
  else if (display.count > 1) projector = { cls: 'amber', text: 'Second screen found, output closed' }
  else projector = { cls: 'amber', text: 'No second screen, output closed' }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">Song and Scripture</div>
        <div className="toolbar-actions">
          <div className="alert-wrap">
            <button className={`btn${state.alert ? ' warn' : ''}`} onClick={() => { setAlertDraft(state.alert ?? ''); setAlertOpen((open) => !open) }}>
              <IconBell size={18} /> Alerts
            </button>
            {alertOpen && (
              <div className="popover" role="dialog" aria-label="Alert message">
                <label>
                  Message on the screen
                  <input autoFocus value={alertDraft} maxLength={200} onChange={(e) => setAlertDraft(e.target.value)} placeholder="e.g. Parents please go to the nursery" />
                </label>
                <div className="popover-actions">
                  <button className="btn small primary" onClick={() => { dispatch({ type: 'setAlert', text: alertDraft }); setAlertOpen(false) }}>Show</button>
                  <button className="btn small" onClick={() => { dispatch({ type: 'setAlert', text: null }); setAlertDraft(''); setAlertOpen(false) }}>Hide</button>
                </div>
              </div>
            )}
          </div>
          {modeButton('logo', 'Logo', <IconPhoto size={18} />)}
          {modeButton('black', 'Black', <IconSquareFilled size={18} />)}
          {modeButton('clear', 'Clear', <IconEraser size={18} />)}
          <button className="btn go-live" onClick={() => dispatch({ type: 'goLive' })} disabled={!item || item.slides.length === 0}>
            <IconPlayerPlayFilled size={18} /> Go live
          </button>
        </div>
      </header>

      <main className="workspace">
        <SchedulePane
          name={state.scheduleName}
          items={state.items}
          selectedId={state.previewItemId}
          liveId={state.live?.itemId ?? null}
          backgroundMissingIds={missingIds}
          onSelect={(id) => dispatch({ type: 'selectItem', id })}
          onRemove={(id) => dispatch({ type: 'removeItem', id })}
        />
        <PreviewPane
          item={item}
          index={state.previewIndex}
          outputTheme={state.outputTheme}
          background={previewBackground}
          dim={state.dim}
          onSelectSlide={(index) => dispatch({ type: 'selectSlide', index })}
          onGoLive={() => dispatch({ type: 'goLive' })}
        />
        <LivePane
          title={state.live?.title ?? null}
          slides={state.live?.slides ?? []}
          index={state.live?.index ?? 0}
          output={output}
          onGoto={(index) => dispatch({ type: 'liveGoto', index })}
        />
      </main>

      {bibleFile && (
        <BibleImportDialog
          file={bibleFile}
          onClose={() => setBibleFile(null)}
          onSaved={(version) => {
            setVersions(installedVersions())
            setBibleVersion(version)
            setBibleFile(null)
          }}
        />
      )}

      <Tray
        bibles={{
          versions,
          version: bibleVersion,
          onVersion: setBibleVersion,
          onAddBible: () => void window.api.pickBibleFile().then((file) => file && setBibleFile(file)),
          onRemoveBible: (version) =>
            void window.api.removeBible(version).then(() => {
              unregisterBible(version)
              setVersions(installedVersions())
              setBibleVersion('KJV')
            })
        }}
        tab={state.tab}
        onTab={(tab) => dispatch({ type: 'setTab', tab })}
        onAdd={(it) => dispatch({ type: 'addItem', item: it })}
        media={{
          media: state.media,
          itemTitle: item?.title ?? null,
          itemBackground: item?.background,
          defaultBackground: state.defaultBackground,
          dim: state.dim,
          onAdd: () => void window.api.addMedia().then((media) => dispatch({ type: 'setMedia', media })),
          onRemove: (id) => void window.api.removeMedia(id).then((media) => dispatch({ type: 'setMedia', media })),
          onSetItem: (background) => item && dispatch({ type: 'setItemBackground', itemId: item.id, background }),
          onSetDefault: (mediaId) => dispatch({ type: 'setDefaultBackground', mediaId }),
          onDim: (dim) => dispatch({ type: 'setDim', dim })
        }}
      />

      <footer className="statusbar">
        <span className={`status ${projector.cls}`}>
          <span className="dot" /> {projector.text}
        </span>
        <span className="status-spacer" />
        <span className="muted">Saved automatically</span>
        <div className="seg" role="group" aria-label="Operator theme">
          <button className={state.theme === 'dark' ? 'active' : ''} onClick={() => dispatch({ type: 'setTheme', theme: 'dark' })}><IconMoon size={14} /> Dark</button>
          <button className={state.theme === 'light' ? 'active' : ''} onClick={() => dispatch({ type: 'setTheme', theme: 'light' })}><IconSun size={14} /> Light</button>
        </div>
        <div className="seg" role="group" aria-label="Audience screen theme">
          <span className="seg-label">Screen</span>
          <button className={state.outputTheme === 'dark' ? 'active' : ''} onClick={() => dispatch({ type: 'setOutputTheme', theme: 'dark' })}>Dark</button>
          <button className={state.outputTheme === 'light' ? 'active' : ''} onClick={() => dispatch({ type: 'setOutputTheme', theme: 'light' })}>Light</button>
        </div>
        <button className="btn small" onClick={() => void window.api.toggleOutput().then(setDisplay)}>
          <IconScreenShare size={16} /> {display.outputOpen ? 'Close output' : 'Open output'}
        </button>
      </footer>
    </div>
  )
}

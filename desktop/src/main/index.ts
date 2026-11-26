import { app, BrowserWindow, dialog, ipcMain, net, powerSaveBlocker, protocol, screen } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IPC } from '../shared/ipc'
import { sanitizeStyle } from '../shared/style'
import { isMediaUrl, MEDIA_PROTOCOL } from '../shared/media'
import { createBibleStore, type BibleStore } from './bibleStore'
import { createMediaStore, type MediaStore } from './mediaStore'
import { DEFAULT_OUTPUT, type DisplayInfo, type OutputState } from '../shared/types'

// Must run before the app is ready so videos can stream and seek from local files.
protocol.registerSchemesAsPrivileged([
  { scheme: MEDIA_PROTOCOL, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: false } }
])

let mediaStore: MediaStore
let bibleStore: BibleStore

const MAX_BIBLE_FILE_BYTES = 30 * 1024 * 1024

function decodeText(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}
let operatorWindow: BrowserWindow | null = null
let outputWindow: BrowserWindow | null = null
let outputOnSecondary = false
// The operator wants the projector on. It survives a cable being pulled or a projector being switched off, so the output comes back by itself.
let wantOutput = false
let keepAwake: number | null = null
let lastState: OutputState = DEFAULT_OUTPUT

const MODES = new Set(['slide', 'black', 'logo', 'clear'])
const THEMES = new Set(['dark', 'light'])

function isOutputState(value: unknown): value is OutputState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  if (typeof state.mode !== 'string' || !MODES.has(state.mode)) return false
  if (typeof state.theme !== 'string' || !THEMES.has(state.theme)) return false
  if (state.alert !== null && (typeof state.alert !== 'string' || state.alert.length > 500)) return false
  if (typeof state.dim !== 'number' || state.dim < 0 || state.dim > 90) return false
  if (state.background !== null) {
    if (typeof state.background !== 'object') return false
    const bg = state.background as Record<string, unknown>
    if ((bg.kind !== 'image' && bg.kind !== 'video') || !isMediaUrl(bg.url)) return false
  }
  if (state.slide !== null) {
    if (typeof state.slide !== 'object') return false
    const slide = state.slide as Record<string, unknown>
    if (!Array.isArray(slide.lines) || !slide.lines.every((line) => typeof line === 'string')) return false
  }
  return true
}

function webPreferences(): Electron.WebPreferences {
  return {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
}

function loadPage(window: BrowserWindow, page: string): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) {
    void window.loadURL(`${devUrl}/${page}`)
  } else {
    void window.loadFile(join(__dirname, `../renderer/${page}`))
  }
}

function lockNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

function findSecondaryDisplay(): Electron.Display | null {
  if (!operatorWindow) return null
  const current = screen.getDisplayMatching(operatorWindow.getBounds())
  return screen.getAllDisplays().find((display) => display.id !== current.id) ?? null
}

function displayInfo(): DisplayInfo {
  return {
    count: screen.getAllDisplays().length,
    outputOpen: outputWindow !== null,
    outputOnSecondary
  }
}

function broadcastDisplayInfo(): void {
  if (operatorWindow && !operatorWindow.isDestroyed()) {
    operatorWindow.webContents.send(IPC.displayInfo, displayInfo())
  }
}

function createOperatorWindow(): void {
  operatorWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0A0A0A',
    title: 'Song and Scripture',
    webPreferences: webPreferences()
  })
  lockNavigation(operatorWindow)
  operatorWindow.once('ready-to-show', () => operatorWindow?.show())
  operatorWindow.on('closed', () => {
    operatorWindow = null
    outputWindow?.close()
  })
  loadPage(operatorWindow, 'index.html')
}

function openOutput(): void {
  if (outputWindow) return
  const secondary = findSecondaryDisplay()
  outputOnSecondary = secondary !== null

  const options: Electron.BrowserWindowConstructorOptions = {
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    title: 'Song and Scripture output',
    webPreferences: webPreferences()
  }

  if (secondary) {
    Object.assign(options, {
      x: secondary.bounds.x,
      y: secondary.bounds.y,
      width: secondary.bounds.width,
      height: secondary.bounds.height,
      frame: false
    })
  } else {
    Object.assign(options, { width: 960, height: 540, useContentSize: true })
  }

  const window = new BrowserWindow(options)
  outputWindow = window
  lockNavigation(window)

  window.once('ready-to-show', () => {
    if (secondary) {
      // Mixed display scaling (for example a 125% laptop with a 100% projector) can put a new window slightly off, so set the bounds again.
      window.setBounds(secondary.bounds)
      window.setFullScreen(true)
    }
    window.showInactive()
    // Keep the keyboard on the operator screen: Down arrow, Ctrl+C and the rest only work there.
    if (secondary) operatorWindow?.focus()
  })
  window.on('focus', () => {
    if (outputOnSecondary && operatorWindow && !operatorWindow.isDestroyed()) operatorWindow.focus()
  })
  // The laptop must not dim or sleep in the middle of a service.
  if (keepAwake === null) keepAwake = powerSaveBlocker.start('prevent-display-sleep')
  window.webContents.on('did-finish-load', () => {
    window.webContents.send(IPC.outputState, lastState)
  })
  window.on('closed', () => {
    outputWindow = null
    outputOnSecondary = false
    if (keepAwake !== null) {
      powerSaveBlocker.stop(keepAwake)
      keepAwake = null
    }
    broadcastDisplayInfo()
  })

  loadPage(window, 'output.html')
  broadcastDisplayInfo()
}

function registerIpc(): void {
  ipcMain.on(IPC.setOutput, (_event, state: unknown) => {
    if (!isOutputState(state)) return
    const clean: OutputState = { ...state, style: sanitizeStyle((state as { style?: unknown }).style) }
    lastState = clean
    if (outputWindow && !outputWindow.isDestroyed()) {
      outputWindow.webContents.send(IPC.outputState, clean)
    }
  })

  ipcMain.on(IPC.requestOutputState, (event) => {
    event.sender.send(IPC.outputState, lastState)
  })

  ipcMain.handle(IPC.listMedia, () => mediaStore.list())

  ipcMain.handle(IPC.addMedia, async () => {
    const options: Electron.OpenDialogOptions = {
      title: 'Add photos and videos',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Photos and videos', extensions: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'm4v'] }]
    }
    const result = operatorWindow ? await dialog.showOpenDialog(operatorWindow, options) : await dialog.showOpenDialog(options)
    if (result.canceled) return mediaStore.list()
    return mediaStore.add(result.filePaths)
  })

  ipcMain.handle(IPC.removeMedia, (_event, id: unknown) => {
    return typeof id === 'string' ? mediaStore.remove(id) : mediaStore.list()
  })

  ipcMain.handle(IPC.pickBibleFile, async () => {
    const options: Electron.OpenDialogOptions = {
      title: 'Choose a Bible file',
      properties: ['openFile'],
      filters: [{ name: 'Bible files', extensions: ['txt', 'csv', 'tsv', 'json'] }]
    }
    const result = operatorWindow ? await dialog.showOpenDialog(operatorWindow, options) : await dialog.showOpenDialog(options)
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    try {
      if ((await stat(path)).size > MAX_BIBLE_FILE_BYTES) return null
      return { fileName: basename(path), text: decodeText(await readFile(path)) }
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC.listBibles, () => bibleStore.list())
  ipcMain.handle(IPC.saveBible, (_event, bible: unknown) => bibleStore.save(bible))
  ipcMain.handle(IPC.removeBible, (_event, version: unknown) => {
    return typeof version === 'string' ? bibleStore.remove(version) : undefined
  })

  ipcMain.handle(IPC.getDisplayInfo, () => displayInfo())

  ipcMain.handle(IPC.toggleOutput, () => {
    if (outputWindow) {
      wantOutput = false
      outputWindow.close()
      return { ...displayInfo(), outputOpen: false, outputOnSecondary: false }
    }
    wantOutput = true
    openOutput()
    return displayInfo()
  })
}

function registerScreenEvents(): void {
  screen.on('display-added', () => {
    broadcastDisplayInfo()
    if (!wantOutput || !findSecondaryDisplay()) return
    if (!outputWindow) {
      // The projector came back (or was plugged in late): put the output on it.
      openOutput()
    } else if (!outputOnSecondary) {
      // The output was in a small window because there was no second screen. Move it to the projector.
      outputWindow.once('closed', () => {
        if (wantOutput && !outputWindow) openOutput()
      })
      outputWindow.close()
    }
  })
  screen.on('display-removed', () => {
    // Cable pulled or projector off: close the output window, but remember that the operator wants it, so it returns with the screen.
    if (outputWindow && outputOnSecondary && findSecondaryDisplay() === null) {
      outputWindow.close()
    }
    broadcastDisplayInfo()
  })
}

function registerMediaProtocol(): void {
  protocol.handle(MEDIA_PROTOCOL, (request) => {
    // Only files inside our own media folder are served; basename blocks ../ tricks.
    const name = basename(decodeURIComponent(new URL(request.url).pathname))
    const file = pathToFileURL(join(mediaStore.dir, name)).toString()
    return net.fetch(file, { headers: request.headers, bypassCustomProtocolHandlers: true })
  })
}

void app.whenReady().then(() => {
  mediaStore = createMediaStore(join(app.getPath('userData'), 'media'))
  bibleStore = createBibleStore(join(app.getPath('userData'), 'bibles'))
  registerMediaProtocol()
  registerIpc()
  registerScreenEvents()
  createOperatorWindow()
  // A projector already plugged in at start: open the output on it without a click.
  if (findSecondaryDisplay() !== null) {
    wantOutput = true
    openOutput()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

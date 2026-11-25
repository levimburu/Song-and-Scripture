import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc'
import { DEFAULT_OUTPUT, type DisplayInfo, type OutputState } from '../shared/types'

let operatorWindow: BrowserWindow | null = null
let outputWindow: BrowserWindow | null = null
let outputOnSecondary = false
let lastState: OutputState = DEFAULT_OUTPUT

const MODES = new Set(['slide', 'black', 'logo', 'clear'])
const THEMES = new Set(['dark', 'light'])

function isOutputState(value: unknown): value is OutputState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  if (typeof state.mode !== 'string' || !MODES.has(state.mode)) return false
  if (typeof state.theme !== 'string' || !THEMES.has(state.theme)) return false
  if (state.alert !== null && (typeof state.alert !== 'string' || state.alert.length > 500)) return false
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
    if (secondary) window.setFullScreen(true)
    window.showInactive()
  })
  window.webContents.on('did-finish-load', () => {
    window.webContents.send(IPC.outputState, lastState)
  })
  window.on('closed', () => {
    outputWindow = null
    outputOnSecondary = false
    broadcastDisplayInfo()
  })

  loadPage(window, 'output.html')
  broadcastDisplayInfo()
}

function registerIpc(): void {
  ipcMain.on(IPC.setOutput, (_event, state: unknown) => {
    if (!isOutputState(state)) return
    lastState = state
    if (outputWindow && !outputWindow.isDestroyed()) {
      outputWindow.webContents.send(IPC.outputState, state)
    }
  })

  ipcMain.on(IPC.requestOutputState, (event) => {
    event.sender.send(IPC.outputState, lastState)
  })

  ipcMain.handle(IPC.getDisplayInfo, () => displayInfo())

  ipcMain.handle(IPC.toggleOutput, () => {
    if (outputWindow) {
      outputWindow.close()
      return { ...displayInfo(), outputOpen: false, outputOnSecondary: false }
    }
    openOutput()
    return displayInfo()
  })
}

function registerScreenEvents(): void {
  screen.on('display-added', broadcastDisplayInfo)
  screen.on('display-removed', () => {
    if (outputWindow && outputOnSecondary && findSecondaryDisplay() === null) {
      outputWindow.close()
    }
    broadcastDisplayInfo()
  })
}

void app.whenReady().then(() => {
  registerIpc()
  registerScreenEvents()
  createOperatorWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

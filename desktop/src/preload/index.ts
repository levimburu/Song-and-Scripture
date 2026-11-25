import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { Api, BibleFileContents, DisplayInfo, MediaFile, OutputState } from '../shared/types'

function subscribe<T>(channel: string, callback: (value: T) => void): () => void {
  const handler = (_event: unknown, value: T): void => callback(value)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const api: Api = {
  setOutput: (state) => ipcRenderer.send(IPC.setOutput, state),
  requestOutputState: () => ipcRenderer.send(IPC.requestOutputState),
  onOutputState: (callback) => subscribe<OutputState>(IPC.outputState, callback),
  getDisplayInfo: () => ipcRenderer.invoke(IPC.getDisplayInfo) as Promise<DisplayInfo>,
  onDisplayInfo: (callback) => subscribe<DisplayInfo>(IPC.displayInfo, callback),
  toggleOutput: () => ipcRenderer.invoke(IPC.toggleOutput) as Promise<DisplayInfo>,
  listMedia: () => ipcRenderer.invoke(IPC.listMedia) as Promise<MediaFile[]>,
  addMedia: () => ipcRenderer.invoke(IPC.addMedia) as Promise<MediaFile[]>,
  removeMedia: (id) => ipcRenderer.invoke(IPC.removeMedia, id) as Promise<MediaFile[]>,
  pickBibleFile: () => ipcRenderer.invoke(IPC.pickBibleFile) as Promise<BibleFileContents | null>,
  listBibles: () => ipcRenderer.invoke(IPC.listBibles) as Promise<unknown[]>,
  saveBible: (bible) => ipcRenderer.invoke(IPC.saveBible, bible) as Promise<string | null>,
  removeBible: (version) => ipcRenderer.invoke(IPC.removeBible, version) as Promise<void>
}

contextBridge.exposeInMainWorld('api', api)

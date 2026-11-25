import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { Api, DisplayInfo, OutputState } from '../shared/types'

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
  toggleOutput: () => ipcRenderer.invoke(IPC.toggleOutput) as Promise<DisplayInfo>
}

contextBridge.exposeInMainWorld('api', api)

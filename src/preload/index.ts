import { contextBridge, ipcRenderer } from 'electron'
import { AlarmApi, AlarmDraft, RingEvent } from '../shared/alarm'

const api: AlarmApi = {
  list: () => ipcRenderer.invoke('alarms:list'),
  save: (draft: AlarmDraft) => ipcRenderer.invoke('alarms:save', draft),
  remove: (id: string) => ipcRenderer.invoke('alarms:remove', id),
  setEnabled: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('alarms:set-enabled', id, enabled),
  onRing: (callback: (event: RingEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: RingEvent): void =>
      callback(payload)
    ipcRenderer.on('alarms:ring', listener)
    return () => ipcRenderer.removeListener('alarms:ring', listener)
  },
  onChanged: (callback: (alarms: Awaited<ReturnType<AlarmApi['list']>>) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      alarms: Awaited<ReturnType<AlarmApi['list']>>,
    ): void => callback(alarms)
    ipcRenderer.on('alarms:changed', listener)
    return () => ipcRenderer.removeListener('alarms:changed', listener)
  },
}

contextBridge.exposeInMainWorld('alarmApi', api)

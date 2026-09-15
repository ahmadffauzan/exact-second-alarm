import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, powerMonitor, shell } from 'electron'
import { AlarmDraft, RingEvent } from '../shared/alarm'
import { AlarmScheduler, ScheduledAlarm } from './alarm-scheduler'
import { AlarmStore } from './alarm-store'

let mainWindow: BrowserWindow | null = null
let store: AlarmStore
let scheduler: AlarmScheduler

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#f4f0e6',
    title: 'Exact Second',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  window.on('closed', () => {
    mainWindow = null
  })
  return window
}

function bringWindowForward(): void {
  if (!mainWindow) mainWindow = createWindow()
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.focus()
  setTimeout(() => mainWindow?.setAlwaysOnTop(false), 1_000)
}

async function handleRing(scheduled: ScheduledAlarm): Promise<void> {
  if (scheduled.alarm.schedule.type === 'once') {
    await store.setEnabled(scheduled.alarm.id, false)
  }

  bringWindowForward()
  const event: RingEvent = {
    alarm: scheduled.alarm,
    scheduledFor: scheduled.occurrence.toISOString(),
  }
  setTimeout(() => mainWindow?.webContents.send('alarms:ring', event), 150)
}

function registerIpc(): void {
  ipcMain.handle('alarms:list', () => store.list())
  ipcMain.handle('alarms:save', async (_event, draft: AlarmDraft) => {
    const alarms = await store.save(draft)
    scheduler.refresh()
    return alarms
  })
  ipcMain.handle('alarms:remove', async (_event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Invalid alarm ID')
    const alarms = await store.remove(id)
    scheduler.refresh()
    return alarms
  })
  ipcMain.handle('alarms:set-enabled', async (_event, id: unknown, enabled: unknown) => {
    if (typeof id !== 'string' || typeof enabled !== 'boolean') {
      throw new Error('Invalid alarm update')
    }
    const alarms = await store.setEnabled(id, enabled)
    scheduler.refresh()
    return alarms
  })
}

app.whenReady().then(async () => {
  store = new AlarmStore(join(app.getPath('userData'), 'alarms.json'))
  await store.load()
  await store.disableExpiredOneTimeAlarms()
  scheduler = new AlarmScheduler(() => store.list(), handleRing)
  registerIpc()

  mainWindow = createWindow()
  scheduler.start()

  powerMonitor.on('suspend', () => scheduler.stop())
  powerMonitor.on('resume', () => {
    void store.disableExpiredOneTimeAlarms().then(() => {
      scheduler.start()
      mainWindow?.webContents.send('alarms:changed', store.list())
    })
  })
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => scheduler?.stop())

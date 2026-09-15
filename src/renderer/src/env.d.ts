import { AlarmApi } from '../../shared/alarm'

declare global {
  interface Window {
    alarmApi: AlarmApi
  }
}

export {}

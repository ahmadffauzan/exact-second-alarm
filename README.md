# Exact Second

A Windows-first desktop alarm clock that lets you schedule alarms to the exact second.

Exact Second supports multiple independent alarms, a full `HH:MM:SS` time, one-time dates,
daily recurrence, and selected weekdays. Everything stays on your computer.

## Features

- Create, edit, enable, disable, and delete multiple alarms
- Schedule to the second using a 24-hour clock
- Choose one-time, daily, or selected-weekday recurrence
- Preview three built-in procedural sounds
- Restore and focus the app when an alarm rings
- Persist alarms locally between restarts
- Skip alarms missed while Windows was asleep
- Use the app without an account, cloud service, or telemetry

## Alarm behavior

Keep Exact Second open or minimized for alarms to ring. Closing the window quits the app and
stops alarm scheduling.

The Electron main process schedules alarms independently of the interface. It targets the
configured local wall-clock second while the app is running and Windows is awake. Windows is not
a hard real-time operating system, so heavy system load may still introduce a small delay.

One-time alarms disable themselves after ringing. If Windows sleeps through an alarm, the missed
occurrence is skipped after wake-up.

## Development

Requirements:

- Windows 10 or newer
- Node.js 22+
- npm 10+

```powershell
npm install
npm run dev
```

Useful commands:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run package:win
```

The Windows installer is written to `release/`.

## Local data

Alarms are stored in Electron's app data directory:

```text
%APPDATA%\exact-second-alarm\alarms.json
```

The exact parent directory can vary by installed product metadata. No alarm data leaves the
computer.

## Architecture

- `src/main`: Electron window lifecycle, alarm persistence, and scheduling
- `src/preload`: narrow, typed IPC bridge
- `src/renderer`: React interface and procedural Web Audio sounds
- `src/shared`: alarm model, validation, and recurrence calculations

The renderer runs with context isolation, sandboxing, and no Node.js access.

## License

[MIT](LICENSE)

import { SoundId } from '@shared/alarm'

let context: AudioContext | null = null

function audioContext(): AudioContext {
  context ??= new AudioContext()
  void context.resume()
  return context
}

function tone(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  startsAt: number,
  duration: number,
  type: OscillatorType = 'square',
  endFrequency?: number,
): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startsAt)
  if (endFrequency)
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startsAt + duration)
  gain.gain.setValueAtTime(0.0001, startsAt)
  gain.gain.exponentialRampToValueAtTime(0.28, startsAt + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(startsAt)
  oscillator.stop(startsAt + duration)
}

function playOnce(sound: SoundId): void {
  const ctx = audioContext()
  const now = ctx.currentTime + 0.02
  const master = ctx.createGain()
  master.gain.value = 0.5
  master.connect(ctx.destination)

  if (sound === 'pulse') {
    tone(ctx, master, 740, now, 0.18)
    tone(ctx, master, 980, now + 0.24, 0.18)
    tone(ctx, master, 740, now + 0.62, 0.18)
    tone(ctx, master, 980, now + 0.86, 0.18)
  } else if (sound === 'radar') {
    tone(ctx, master, 330, now, 0.65, 'sine', 1_100)
    tone(ctx, master, 440, now + 0.8, 0.65, 'sine', 1_400)
  } else {
    tone(ctx, master, 784, now, 1.25, 'sine')
    tone(ctx, master, 1_176, now, 1.05, 'sine')
    tone(ctx, master, 1_568, now, 0.85, 'sine')
    tone(ctx, master, 784, now + 0.45, 1.2, 'sine')
  }

  setTimeout(() => master.disconnect(), 2_200)
}

export function previewSound(sound: SoundId): void {
  playOnce(sound)
}

export function startAlarmSound(sound: SoundId): () => void {
  playOnce(sound)
  const interval = window.setInterval(() => playOnce(sound), 2_200)
  return () => window.clearInterval(interval)
}

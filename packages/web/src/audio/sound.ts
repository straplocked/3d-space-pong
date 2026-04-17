/**
 * Procedural Web Audio sound engine — no audio assets, everything is
 * generated on the fly with oscillators. Designed for the old-school
 * arcade beeps-and-bloops vibe.
 *
 * Usage:
 *   import { sfx } from "./audio/sound.js";
 *   sfx.unlock();       // call from a user gesture (iOS requires this)
 *   sfx.paddleHit();    // short beep
 *   sfx.setEnabled(false); // mute
 *
 * Enabled state persists in localStorage so mute survives reloads.
 */

const STORAGE_KEY = "3d-pong:audio";
const MASTER_VOLUME = 0.18;

type Ctx = AudioContext & {
  webkitAudioContext?: typeof AudioContext;
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "off") this.enabled = false;
    } catch {
      // localStorage may throw in privacy modes — ignore.
    }
  }

  private ensureCtx(): void {
    if (this.ctx) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC() as Ctx;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? MASTER_VOLUME : 0;
      this.master.connect(this.ctx.destination);
    } catch {
      // AudioContext creation failed — bail quietly.
    }
  }

  /** Must be called from a user gesture to unlock audio on iOS. */
  unlock(): void {
    this.ensureCtx();
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      // ignore
    }
    if (this.master) {
      this.master.gain.value = on ? MASTER_VOLUME : 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a short single-oscillator beep with an AR envelope.
   * @param freq     starting frequency in Hz
   * @param duration note length in seconds
   * @param type     oscillator waveform
   * @param offset   delay from "now" in seconds
   * @param endFreq  if set, slide from `freq` → `endFreq` over the duration
   * @param gain     peak volume multiplier (0..1) — default 1 (= MASTER_VOLUME)
   */
  private beep(
    freq: number,
    duration: number,
    type: OscillatorType = "square",
    offset = 0,
    endFreq?: number,
    gain = 1,
  ): void {
    this.ensureCtx();
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = this.ctx.currentTime + offset;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFreq),
        now + duration,
      );
    }

    const env = this.ctx.createGain();
    // Quick attack to avoid clicks, then exponential decay.
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gain, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(env);
    env.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // ---- Gameplay cues ----

  paddleHit(): void {
    this.beep(520, 0.07, "square");
  }

  wallHit(): void {
    this.beep(260, 0.05, "square");
  }

  score(): void {
    // Short triad that sounds like "point scored"
    this.beep(880, 0.1, "square");
    this.beep(660, 0.14, "square", 0.08);
  }

  win(): void {
    // Rising 1-5-8 arpeggio
    this.beep(523, 0.12, "square", 0);
    this.beep(659, 0.12, "square", 0.12);
    this.beep(784, 0.12, "square", 0.24);
    this.beep(1047, 0.25, "square", 0.36);
  }

  loss(): void {
    // Descending sad trombone — sawtooth for grit
    this.beep(392, 0.18, "sawtooth", 0, undefined, 0.9);
    this.beep(311, 0.2, "sawtooth", 0.16, undefined, 0.85);
    this.beep(233, 0.35, "sawtooth", 0.34, 185, 0.85);
  }

  // ---- UI cues ----

  menuBlip(): void {
    this.beep(880, 0.03, "square", 0, undefined, 0.6);
  }

  menuSelect(): void {
    this.beep(660, 0.05, "square", 0);
    this.beep(990, 0.05, "square", 0.04);
  }
}

export const sfx = new SoundEngine();

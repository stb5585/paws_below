import type { PowerKind } from '../types';

export class Soundscape {
  private context?: AudioContext;
  private melodyTimer?: number;
  muted = false;

  private ensure(): AudioContext | undefined {
    if (this.muted) return undefined;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private tone(frequency: number, duration = .12, type: OscillatorType = 'sine', volume = .045, delay = 0): void {
    const context = this.ensure();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  startMusic(): void {
    if (this.melodyTimer || this.muted) return;
    const notes = [261.6, 329.6, 392, 329.6, 293.7, 349.2, 440, 349.2];
    let index = 0;
    this.melodyTimer = window.setInterval(() => {
      this.tone(notes[index++ % notes.length], .7, 'sine', .018);
    }, 900);
  }

  stopMusic(): void { if (this.melodyTimer) window.clearInterval(this.melodyTimer); this.melodyTimer = undefined; }
  setMuted(muted: boolean): void { this.muted = muted; if (muted) this.stopMusic(); else this.startMusic(); }
  click(): void { this.tone(440, .07, 'sine', .035); }
  pickup(): void { this.tone(660, .1, 'triangle', .05); this.tone(880, .16, 'triangle', .04, .08); }
  bark(variant = Math.random()): void {
    const base = variant > .5 ? 180 : 215;
    this.tone(base, .10, 'square', .075);
    this.tone(base * .82, .12, 'square', .065, .11);
  }
  jump(): void { this.tone(330, .09, 'sine', .04); this.tone(520, .16, 'sine', .04, .06); }
  dig(): void { this.tone(105, .14, 'triangle', .045); this.tone(125, .12, 'triangle', .04, .18); }
  power(kind: PowerKind): void {
    const root = kind === 'zoomie' ? 520 : kind === 'glow' ? 392 : 293;
    [1, 1.25, 1.5].forEach((ratio, i) => this.tone(root * ratio, .22, 'sine', .04, i * .1));
  }
  treasure(pirate: boolean): void {
    const notes = pirate ? [220, 277, 330, 440, 554] : [392, 494, 587];
    notes.forEach((note, index) => this.tone(note, .28, 'triangle', .05, index * .1));
  }
  win(): void { [262, 330, 392, 523].forEach((note, index) => this.tone(note, .45, 'sine', .05, index * .16)); }
}

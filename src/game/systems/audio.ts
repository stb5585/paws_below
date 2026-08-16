import type { PowerKind } from '../types';
import oneBarkUrl from '../sounds/one_bark.wav?url';
import threeBarksUrl from '../sounds/three_barks.wav?url';
import oneHonkUrl from '../sounds/one_honk.wav?url';
import threeHonksUrl from '../sounds/three_honks.wav?url';

export class Soundscape {
  private static readonly callVolume = .34;
  private context?: AudioContext;
  private melodyTimer?: number;
  private barkPlayers = new Map<'single' | 'treasure', HTMLAudioElement>();
  private honkPlayers = new Map<'single' | 'treasure', HTMLAudioElement>();
  muted = false;

  constructor() {
    if (typeof Audio === 'undefined') return;
    const single = new Audio(oneBarkUrl);
    const treasure = new Audio(threeBarksUrl);
    single.preload = 'auto'; treasure.preload = 'auto';
    this.barkPlayers.set('single', single); this.barkPlayers.set('treasure', treasure);
    const singleHonk = new Audio(oneHonkUrl);
    const treasureHonks = new Audio(threeHonksUrl);
    singleHonk.preload = 'auto'; treasureHonks.preload = 'auto';
    this.honkPlayers.set('single', singleHonk); this.honkPlayers.set('treasure', treasureHonks);
  }

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
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) { this.stopMusic(); this.barkPlayers.forEach(player => player.pause()); this.honkPlayers.forEach(player => player.pause()); }
    else this.startMusic();
  }
  click(): void { this.tone(440, .07, 'sine', .035); }
  pickup(): void { this.tone(660, .1, 'triangle', .05); this.tone(880, .16, 'triangle', .04, .08); }
  bark(nearTreasure = false): void {
    if (this.muted) return;
    const player = this.barkPlayers.get(nearTreasure ? 'treasure' : 'single');
    if (player) {
      this.barkPlayers.forEach(activePlayer => { activePlayer.pause(); activePlayer.currentTime = 0; });
      player.volume = Soundscape.callVolume;
      void player.play().catch(() => this.syntheticBark(nearTreasure));
      return;
    }
    this.syntheticBark(nearTreasure);
  }
  honk(nearTreasure = false): void {
    if (this.muted) return;
    const player = this.honkPlayers.get(nearTreasure ? 'treasure' : 'single');
    if (player) {
      this.honkPlayers.forEach(activePlayer => { activePlayer.pause(); activePlayer.currentTime = 0; });
      player.volume = Soundscape.callVolume;
      void player.play().catch(() => this.syntheticHonk(nearTreasure));
      return;
    }
    this.syntheticHonk(nearTreasure);
  }
  private syntheticBark(threeBarks: boolean): void {
    const count = threeBarks ? 3 : 1;
    for (let index = 0; index < count; index++) {
      this.tone(205, .10, 'square', .035, index * .27);
      this.tone(168, .12, 'square', .03, index * .27 + .11);
    }
  }
  private syntheticHonk(threeHonks: boolean): void {
    const count = threeHonks ? 3 : 1;
    for (let index = 0; index < count; index++) {
      this.tone(310, .16, 'sawtooth', .032, index * .3);
      this.tone(245, .18, 'triangle', .028, index * .3 + .09);
    }
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

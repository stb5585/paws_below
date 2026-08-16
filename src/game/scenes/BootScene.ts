import Phaser from 'phaser';
import { Soundscape } from '../systems/audio';
import { loadProfile } from '../systems/profile';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.load.image('title-animals', 'assets/title-animals.webp');
    this.load.image('menu-burrow', 'assets/menu-burrow.webp');
    const bar = this.add.rectangle(640, 635, 420, 16, 0x3a2118).setStrokeStyle(2, 0xffdf9d);
    const fill = this.add.rectangle(432, 635, 4, 10, 0x80dfc2).setOrigin(0, .5);
    this.load.on('progress', (progress: number) => { fill.width = Math.max(4, 416 * progress); });
    this.load.on('complete', () => { bar.destroy(); fill.destroy(); });
  }

  create(): void {
    const profile = loadProfile();
    const soundscape = new Soundscape();
    soundscape.muted = profile.muted;
    this.registry.set('profile', profile);
    this.registry.set('soundscape', soundscape);
    this.scene.start('Title');
  }
}

import Phaser from 'phaser';
import { addPanel, createButton, heading } from '../ui';
import type { Soundscape } from '../systems/audio';
import type { PlayerProfile } from '../systems/profile';
import { saveProfile } from '../systems/profile';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x120b09, .78);
    addPanel(this, 640, 360, 530, 610, .97);
    heading(this, 640, 112, 'PAUSED', 54);
    const sound = this.registry.get('soundscape') as Soundscape;
    const profile = this.registry.get('profile') as PlayerProfile;
    createButton(this, 640, 210, 'KEEP EXPLORING', () => { sound.click(); this.scene.stop(); this.scene.resume('Maze'); }, { width: 350, height: 62, icon: '🐾' });
    const mute = createButton(this, 640, 292, profile.muted ? 'SOUND OFF' : 'SOUND ON', () => {
      profile.muted = !profile.muted; sound.setMuted(profile.muted); saveProfile(profile);
      (mute.getAt(2) as Phaser.GameObjects.Text).setText(`${profile.muted ? '🔇' : '🔊'}  ${profile.muted ? 'SOUND OFF' : 'SOUND ON'}`);
    }, { width: 350, height: 62, icon: profile.muted ? '🔇' : '🔊', color: 0x547f78 });
    const bright = createButton(this, 640, 374, profile.fullBrightness ? 'FULL BRIGHTNESS' : 'COZY LIGHT', () => {
      profile.fullBrightness = !profile.fullBrightness; saveProfile(profile);
      (bright.getAt(2) as Phaser.GameObjects.Text).setText(`☀️  ${profile.fullBrightness ? 'FULL BRIGHTNESS' : 'COZY LIGHT'}`);
      this.game.events.emit('brightness-changed');
    }, { width: 350, height: 62, icon: '☀️', color: 0x8a6a3d });
    const touch = createButton(this, 640, 456, `TOUCH ${profile.touchControls.toUpperCase()}`, () => {
      profile.touchControls = profile.touchControls === 'auto' ? 'on' : profile.touchControls === 'on' ? 'off' : 'auto';
      saveProfile(profile); this.game.events.emit('touch-controls-changed');
      (touch.getAt(2) as Phaser.GameObjects.Text).setText(`☝  TOUCH ${profile.touchControls.toUpperCase()}`);
    }, { width: 350, height: 62, fontSize: 23, icon: '☝', color: 0x6a4a72 });
    createButton(this, 640, 548, 'HOME', () => {
      sound.click(); this.scene.stop('Maze'); this.scene.start('Title');
    }, { width: 350, height: 62, icon: '🏠', color: 0x694638 });
    this.input.keyboard?.once('keydown-ESC', () => { this.scene.stop(); this.scene.resume('Maze'); });
  }
}

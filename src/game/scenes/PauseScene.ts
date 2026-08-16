import Phaser from 'phaser';
import { addPanel, addViewportShade, createButton, heading } from '../ui';
import type { Soundscape } from '../systems/audio';
import type { PlayerProfile } from '../systems/profile';
import { saveProfile } from '../systems/profile';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create(): void {
    addViewportShade(this, 0x120b09, .78);
    addPanel(this, 640, 360, 530, 660, .97);
    heading(this, 640, 76, 'PAUSED', 50);
    const sound = this.registry.get('soundscape') as Soundscape;
    const profile = this.registry.get('profile') as PlayerProfile;
    createButton(this, 640, 155, 'KEEP EXPLORING', () => { sound.click(); this.scene.stop(); this.scene.resume('Maze'); }, { width: 350, height: 58, icon: '🐾', fontSize: 25 });
    const mute = createButton(this, 640, 230, profile.muted ? 'SOUND OFF' : 'SOUND ON', () => {
      profile.muted = !profile.muted; sound.setMuted(profile.muted); saveProfile(profile);
      (mute.getAt(2) as Phaser.GameObjects.Text).setText(`${profile.muted ? '🔇' : '🔊'}  ${profile.muted ? 'SOUND OFF' : 'SOUND ON'}`);
    }, { width: 350, height: 58, icon: profile.muted ? '🔇' : '🔊', color: 0x547f78, fontSize: 25 });
    const bright = createButton(this, 640, 305, profile.fullBrightness ? 'FULL BRIGHTNESS' : 'COZY LIGHT', () => {
      profile.fullBrightness = !profile.fullBrightness; saveProfile(profile);
      (bright.getAt(2) as Phaser.GameObjects.Text).setText(`☀️  ${profile.fullBrightness ? 'FULL BRIGHTNESS' : 'COZY LIGHT'}`);
      this.game.events.emit('brightness-changed');
    }, { width: 350, height: 58, icon: '☀️', color: 0x8a6a3d, fontSize: 23 });
    const touch = createButton(this, 640, 380, `TOUCH ${profile.touchControls.toUpperCase()}`, () => {
      profile.touchControls = profile.touchControls === 'auto' ? 'on' : profile.touchControls === 'on' ? 'off' : 'auto';
      saveProfile(profile); this.game.events.emit('touch-controls-changed');
      (touch.getAt(2) as Phaser.GameObjects.Text).setText(`☝  TOUCH ${profile.touchControls.toUpperCase()}`);
    }, { width: 350, height: 58, fontSize: 22, icon: '☝', color: 0x6a4a72 });
    const movement = createButton(this, 640, 455, profile.touchMovement === 'follow' ? 'FOLLOW TOUCH' : 'JOYSTICK', () => {
      profile.touchMovement = profile.touchMovement === 'follow' ? 'joystick' : 'follow';
      saveProfile(profile); this.game.events.emit('touch-controls-changed');
      (movement.getAt(2) as Phaser.GameObjects.Text).setText(`↗  ${profile.touchMovement === 'follow' ? 'FOLLOW TOUCH' : 'JOYSTICK'}`);
    }, { width: 350, height: 58, fontSize: 22, icon: '↗', color: 0x4d7085 });
    createButton(this, 640, 545, 'HOME', () => {
      sound.click(); this.scene.stop('Maze'); this.scene.start('Title');
    }, { width: 350, height: 58, icon: '🏠', color: 0x694638, fontSize: 25 });
    this.input.keyboard?.once('keydown-ESC', () => { this.scene.stop(); this.scene.resume('Maze'); });
  }
}

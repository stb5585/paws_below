import Phaser from 'phaser';
import type { Soundscape } from '../systems/audio';
import { resetBestScores, saveProfile, type PlayerProfile } from '../systems/profile';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';

export class SettingsScene extends Phaser.Scene {
  private resetArmed = false;

  constructor() { super('Settings'); }

  create(): void {
    addMenuBackground(this, .55, 'title-animals');
    addPanel(this, 640, 355, 940, 610, .96);
    heading(this, 640, 76, 'SETTINGS', 52);
    let profile = this.registry.get('profile') as PlayerProfile;
    const sound = this.registry.get('soundscape') as Soundscape;

    const mute = createButton(this, 405, 190, profile.muted ? 'SOUND OFF' : 'SOUND ON', () => {
      profile.muted = !profile.muted; sound.setMuted(profile.muted); saveProfile(profile);
      (mute.getAt(2) as Phaser.GameObjects.Text).setText(`${profile.muted ? '🔇' : '🔊'}  ${profile.muted ? 'SOUND OFF' : 'SOUND ON'}`);
    }, { width: 350, height: 60, icon: profile.muted ? '🔇' : '🔊', color: 0x547f78, fontSize: 24 });

    const bright = createButton(this, 875, 190, profile.fullBrightness ? 'FULL BRIGHTNESS' : 'COZY LIGHT', () => {
      profile.fullBrightness = !profile.fullBrightness; saveProfile(profile);
      (bright.getAt(2) as Phaser.GameObjects.Text).setText(`☀️  ${profile.fullBrightness ? 'FULL BRIGHTNESS' : 'COZY LIGHT'}`);
    }, { width: 350, height: 60, icon: '☀️', color: 0x8a6a3d, fontSize: 22 });

    const touch = createButton(this, 405, 285, `TOUCH ${profile.touchControls.toUpperCase()}`, () => {
      profile.touchControls = profile.touchControls === 'auto' ? 'on' : profile.touchControls === 'on' ? 'off' : 'auto';
      saveProfile(profile);
      (touch.getAt(2) as Phaser.GameObjects.Text).setText(`☝  TOUCH ${profile.touchControls.toUpperCase()}`);
    }, { width: 350, height: 60, fontSize: 22, icon: '☝', color: 0x6a4a72 });

    const movement = createButton(this, 875, 285, profile.touchMovement === 'follow' ? 'FOLLOW TOUCH' : 'JOYSTICK', () => {
      profile.touchMovement = profile.touchMovement === 'follow' ? 'joystick' : 'follow';
      saveProfile(profile);
      (movement.getAt(2) as Phaser.GameObjects.Text).setText(`↗  ${profile.touchMovement === 'follow' ? 'FOLLOW TOUCH' : 'JOYSTICK'}`);
    }, { width: 350, height: 60, fontSize: 22, icon: '↗', color: 0x4d7085 });

    this.add.text(640, 362, 'Scores can be cleared without removing treasures, controls, or future appearance choices.', {
      fontFamily:'Fredoka, sans-serif',fontSize:'18px',color:'#d9c3ad',align:'center',wordWrap:{width:760}
    }).setOrigin(.5);
    const notice = this.add.text(640, 492, '', {
      fontFamily:'Fredoka, sans-serif',fontSize:'19px',color:'#ffd989',fontStyle:'bold',align:'center'
    }).setOrigin(.5);
    let cancel: Phaser.GameObjects.Container | undefined;
    const disarm = () => {
      this.resetArmed = false;
      reset.setPosition(640, 430);
      (reset.getAt(2) as Phaser.GameObjects.Text).setText('↺  RESET BEST SCORES');
      notice.setText('');
      cancel?.destroy(true); cancel = undefined;
    };
    const reset = createButton(this, 640, 430, 'RESET BEST SCORES', () => {
      sound.click();
      if (!this.resetArmed) {
        this.resetArmed = true;
        reset.setX(480);
        (reset.getAt(2) as Phaser.GameObjects.Text).setText('⚠  CONFIRM RESET');
        notice.setText('This clears Pip and Mochi best scores only.');
        cancel = createButton(this, 800, 430, 'CANCEL', () => { sound.click(); disarm(); }, {
          width:250,height:60,fontSize:22,icon:'×',color:0x5e514b
        });
        return;
      }
      profile = resetBestScores(profile);
      saveProfile(profile); this.registry.set('profile', profile);
      this.resetArmed = false;
      reset.setPosition(640, 430);
      (reset.getAt(2) as Phaser.GameObjects.Text).setText('✓  SCORES RESET');
      notice.setText('Best scores reset. Treasures and settings are safe.');
      cancel?.destroy(true); cancel = undefined;
      this.time.delayedCall(1800, () => {
        (reset.getAt(2) as Phaser.GameObjects.Text).setText('↺  RESET BEST SCORES');
        notice.setText('');
      });
    }, { width: 360, height: 60, fontSize: 22, icon: '↺', color: 0x985044 });

    createButton(this, 640, 620, 'BACK', () => { sound.click(); this.scene.start('Title'); }, {
      width:240,height:54,fontSize:22,icon:'←',color:0x694638
    });
    this.input.keyboard?.once('keydown-ESC', () => this.resetArmed ? disarm() : this.scene.start('Title'));
  }
}

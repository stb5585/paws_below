import Phaser from 'phaser';
import { addPanel, createButton, heading } from '../ui';
import type { Soundscape } from '../systems/audio';
import type { PlayerProfile } from '../systems/profile';
import { saveProfile } from '../systems/profile';
import { canInstallApp, isInstalledApp, requestAppInstall } from '../../pwa';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create(): void {
    const image = this.add.image(640, 360, 'title-burrow');
    const scale = Math.max(1280 / image.width, 720 / image.height);
    image.setScale(scale);
    this.add.rectangle(640, 360, 1280, 720, 0x160d0a, .25);
    this.add.rectangle(640, 180, 920, 300, 0x1b100d, .52).setStrokeStyle(3, 0xffdda0, .25);
    heading(this, 640, 107, 'PAWS BELOW', 82);
    this.add.text(640, 178, 'A cozy underground adventure', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '28px', color: '#ffe9b6',
      stroke: '#3b2017', strokeThickness: 5
    }).setOrigin(.5);

    const profile = this.registry.get('profile') as PlayerProfile;
    const sound = this.registry.get('soundscape') as Soundscape;
    createButton(this, 640, 270, 'PLAY', () => {
      sound.click(); sound.startMusic();
      this.scene.start(profile.tutorialSeen ? 'Maze' : 'Tutorial');
    }, { width: 290, height: 76, icon: '🐾', color: 0xd96545 });
    createButton(this, 640, 360, 'COLLECTION', () => { sound.click(); this.scene.start('Collection', { from: 'Title' }); }, {
      width: 290, height: 64, fontSize: 25, icon: '🦴', color: 0x418b81
    });

    const touch = createButton(this, 510, 440, `TOUCH ${profile.touchControls.toUpperCase()}`, () => {
      profile.touchControls = profile.touchControls === 'auto' ? 'on' : profile.touchControls === 'on' ? 'off' : 'auto';
      saveProfile(profile);
      (touch.getAt(2) as Phaser.GameObjects.Text).setText(`☝  TOUCH ${profile.touchControls.toUpperCase()}`);
    }, { width: 240, height: 48, fontSize: 17, icon: '☝', color: 0x6a4a38 });

    const install = createButton(this, 770, 440, isInstalledApp() ? 'INSTALLED' : 'INSTALL APP', async () => {
      sound.click();
      const outcome = await requestAppInstall();
      if (outcome === 'instructions') {
        const notice = this.add.text(640, 492, 'On Android Chrome:  ⋮  →  Add to Home screen', {
          fontFamily: 'Fredoka, sans-serif', fontSize: '19px', color: '#b9ffe9', fontStyle: 'bold',
          stroke: '#2a1711', strokeThickness: 5
        }).setOrigin(.5).setDepth(50);
        this.tweens.add({ targets: notice, alpha: 0, y: 480, duration: 450, delay: 3600, onComplete: () => notice.destroy() });
      }
    }, { width: 240, height: 48, fontSize: 17, icon: '⬇', color: 0x477f78 });
    const updateInstall = () => {
      install.setVisible(!isInstalledApp());
      install.setAlpha(canInstallApp() ? 1 : .82);
    };
    window.addEventListener('paws-install-ready', updateInstall);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('paws-install-ready', updateInstall));
    updateInstall();

    addPanel(this, 640, 575, 520, 108, .74);
    const best = this.add.text(640, 548, `BEST SCORE  ${profile.bestScore.toLocaleString()}`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '25px', color: '#fff1ca', fontStyle: 'bold'
    }).setOrigin(.5);
    void best;
    const mute = createButton(this, 548, 600, profile.muted ? 'SOUND OFF' : 'SOUND ON', () => {
      profile.muted = !profile.muted; sound.setMuted(profile.muted); saveProfile(profile);
      (mute.getAt(2) as Phaser.GameObjects.Text).setText(`${profile.muted ? '🔇' : '🔊'}  ${profile.muted ? 'SOUND OFF' : 'SOUND ON'}`);
    }, { width: 220, height: 44, fontSize: 18, icon: profile.muted ? '🔇' : '🔊', color: 0x6a4a38 });
    const light = createButton(this, 772, 600, profile.fullBrightness ? 'BRIGHT' : 'COZY LIGHT', () => {
      profile.fullBrightness = !profile.fullBrightness; saveProfile(profile);
      (light.getAt(2) as Phaser.GameObjects.Text).setText(`☀️  ${profile.fullBrightness ? 'BRIGHT' : 'COZY LIGHT'}`);
    }, { width: 220, height: 44, fontSize: 18, icon: '☀️', color: 0x6a4a38 });

    this.add.text(1238, 688, 'v1.1', { fontFamily: 'Fredoka, sans-serif', fontSize: '16px', color: '#fff1ca99' }).setOrigin(1);
  }
}

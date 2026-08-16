import Phaser from 'phaser';
import { addMenuBackground, createButton, heading } from '../ui';
import type { Soundscape } from '../systems/audio';
import type { PlayerProfile } from '../systems/profile';
import { canInstallApp, isInstalledApp, requestAppInstall } from '../../pwa';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create(): void {
    addMenuBackground(this, .22, 'title-animals');
    this.add.rectangle(640, 180, 920, 300, 0x1b100d, .52).setStrokeStyle(3, 0xffdda0, .25);
    heading(this, 640, 107, 'PAWS BELOW', 82);
    this.add.text(640, 178, 'Choose an animal. Pick an adventure.', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '28px', color: '#ffe9b6',
      stroke: '#3b2017', strokeThickness: 5
    }).setOrigin(.5);

    const profile = this.registry.get('profile') as PlayerProfile;
    const sound = this.registry.get('soundscape') as Soundscape;
    createButton(this, 640, 270, 'PLAY', () => {
      sound.click(); sound.startMusic();
      this.scene.start('AnimalSelect');
    }, { width: 290, height: 76, icon: '🐾', color: 0xd96545 });
    createButton(this, 640, 360, 'COLLECTION', () => { sound.click(); this.scene.start('Collection', { from: 'Title' }); }, {
      width: 290, height: 64, fontSize: 25, icon: '🦴', color: 0x418b81
    });

    createButton(this, 640, 495, 'SETTINGS', () => { sound.click(); this.scene.start('Settings'); }, {
      width:290,height:58,fontSize:23,icon:'⚙',color:0x5f537e
    });

    const install = createButton(this, 1130, 650, isInstalledApp() ? 'INSTALLED' : 'INSTALL APP', async () => {
      sound.click();
      const outcome = await requestAppInstall();
      if (outcome === 'instructions') {
        const notice = this.add.text(640, 470, 'On Android Chrome:  ⋮  →  Add to Home screen', {
          fontFamily: 'Fredoka, sans-serif', fontSize: '19px', color: '#b9ffe9', fontStyle: 'bold',
          stroke: '#2a1711', strokeThickness: 5
        }).setOrigin(.5).setDepth(50);
        this.tweens.add({ targets: notice, alpha: 0, y: 456, duration: 450, delay: 3600, onComplete: () => notice.destroy() });
      }
    }, { width: 210, height: 48, fontSize: 15, icon: '⬇', color: 0x477f78 });
    const updateInstall = () => {
      install.setVisible(!isInstalledApp());
      install.setAlpha(canInstallApp() ? 1 : .82);
    };
    window.addEventListener('paws-install-ready', updateInstall);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('paws-install-ready', updateInstall));
    updateInstall();

    const best = this.add.text(640, 415, `BEST SCORE  ${profile.bestScore.toLocaleString()}`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '25px', color: '#fff1ca', fontStyle: 'bold'
    }).setOrigin(.5);
    void best;
    this.add.text(1238, 688, 'v1.3.1', { fontFamily: 'Fredoka, sans-serif', fontSize: '16px', color: '#fff1ca99' }).setOrigin(1);
  }
}

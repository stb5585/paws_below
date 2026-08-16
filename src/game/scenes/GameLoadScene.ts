import Phaser from 'phaser';
import type { PlayerProfile } from '../systems/profile';
import { queueWorldAssets, registerLoadedAssets } from '../systems/assets';

export class GameLoadScene extends Phaser.Scene {
  private destination = 'Maze';

  constructor() { super('GameLoad'); }

  init(data: { destination?: string }): void {
    this.destination = data.destination ?? 'Maze';
  }

  preload(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#20120e');
    this.add.text(width / 2, height / 2 - 46, 'PACKING THE ADVENTURE…', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '30px', color: '#fff1ca', fontStyle: 'bold'
    }).setOrigin(.5);
    const track = this.add.rectangle(width / 2, height / 2 + 12, 360, 18, 0x3a2118).setStrokeStyle(2, 0xffdf9d);
    const fill = this.add.rectangle(width / 2 - 176, height / 2 + 12, 4, 12, 0x80dfc2).setOrigin(0, .5);
    this.load.on('progress', (progress: number) => fill.setDisplaySize(Math.max(4, 352 * progress), 12));
    this.load.once('complete', () => { track.destroy(); fill.destroy(); });

    const profile = this.registry.get('profile') as PlayerProfile;
    queueWorldAssets(this, profile.selectedMapId, profile.selectedAnimalId);
  }

  create(): void {
    registerLoadedAssets(this);
    this.scene.start(this.destination);
  }
}

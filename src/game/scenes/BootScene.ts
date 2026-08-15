import Phaser from 'phaser';
import { Soundscape } from '../systems/audio';
import { loadProfile } from '../systems/profile';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.load.image('title-burrow', 'assets/title-burrow.png');
    this.load.image('pip-animations-v2', 'assets/pip-animations-v2.png');
    this.load.image('burrow-atlas-v2', 'assets/burrow-atlas-v2.png');
    this.load.image('household-treasures-v2', 'assets/household-treasures-v2.png');
    this.load.image('menu-burrow-v2', 'assets/menu-burrow-v2.png');
    this.load.tilemapTiledJSON('burrow-map', 'assets/burrow-map.json');
    const bar = this.add.rectangle(640, 635, 420, 16, 0x3a2118).setStrokeStyle(2, 0xffdf9d);
    const fill = this.add.rectangle(432, 635, 4, 10, 0x80dfc2).setOrigin(0, .5);
    this.load.on('progress', (progress: number) => { fill.width = Math.max(4, 416 * progress); });
    this.load.on('complete', () => { bar.destroy(); fill.destroy(); });
  }

  create(): void {
    this.registerGridFrames('pip-animations-v2', 'pip', 4, 4);
    this.registerGridFrames('burrow-atlas-v2', 'env', 4, 4);
    this.registerGridFrames('household-treasures-v2', 'treasure', 4, 2);
    this.createDogAnimations();
    const profile = loadProfile();
    const soundscape = new Soundscape();
    soundscape.muted = profile.muted;
    this.registry.set('profile', profile);
    this.registry.set('soundscape', soundscape);
    this.scene.start('Title');
  }

  private registerGridFrames(textureKey: string, prefix: string, columns: number, rows: number): void {
    const texture = this.textures.get(textureKey);
    const source = texture.getSourceImage() as HTMLImageElement;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x0 = Math.round(column * source.width / columns);
        const y0 = Math.round(row * source.height / rows);
        const x1 = Math.round((column + 1) * source.width / columns);
        const y1 = Math.round((row + 1) * source.height / rows);
        texture.add(`${prefix}-${row * columns + column}`, 0, x0, y0, x1 - x0, y1 - y0);
      }
    }
  }

  private createDogAnimations(): void {
    const animation = (key: string, frames: number[], frameRate: number, repeat: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map(frame => ({ key: 'pip-animations-v2', frame: `pip-${frame}` })),
        frameRate,
        repeat
      });
    };
    animation('pip-run', [0, 1, 2, 3], 10, -1);
    animation('pip-dig', [4, 5, 6, 7], 8, 1);
    animation('pip-jump', [8, 9, 10, 11], 9, 0);
    animation('pip-bark', [12, 13, 12], 7, 0);
    animation('pip-idle', [14, 15], 2, -1);
  }
}

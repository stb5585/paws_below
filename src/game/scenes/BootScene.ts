import Phaser from 'phaser';
import { Soundscape } from '../systems/audio';
import { loadProfile } from '../systems/profile';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.load.image('title-burrow', 'assets/title-burrow.png');
    this.load.image('title-animals-v1', 'assets/title-animals-v1.png');
    this.load.image('pip-animations-v3', 'assets/pip-animations-v3.png');
    this.load.image('bunny-animations-v3', 'assets/bunny-animations-v3.png');
    this.load.image('rabbit-atlas-v3', 'assets/rabbit-atlas-v3.png');
    this.load.image('burrow-atlas-v4', 'assets/burrow-atlas-v4.png');
    this.load.image('household-treasures-v4', 'assets/household-treasures-v4.png');
    this.load.image('menu-burrow-v2', 'assets/menu-burrow-v2.png');
    this.load.image('farm-atlas-v3', 'assets/farm-atlas-v3.png');
    this.load.image('farm-treasures-v3', 'assets/farm-treasures-v3.png');
    this.load.tilemapTiledJSON('burrow-map', 'assets/burrow-map.json');
    const bar = this.add.rectangle(640, 635, 420, 16, 0x3a2118).setStrokeStyle(2, 0xffdf9d);
    const fill = this.add.rectangle(432, 635, 4, 10, 0x80dfc2).setOrigin(0, .5);
    this.load.on('progress', (progress: number) => { fill.width = Math.max(4, 416 * progress); });
    this.load.on('complete', () => { bar.destroy(); fill.destroy(); });
  }

  create(): void {
    this.registerGridFrames('pip-animations-v3', 'pip', 4, 4);
    this.registerGridFrames('bunny-animations-v3', 'bunny', 4, 4);
    this.registerGridFrames('rabbit-atlas-v3', 'rabbit', 4, 2);
    this.registerGridFrames('burrow-atlas-v4', 'env', 4, 4);
    this.registerGridFrames('household-treasures-v4', 'treasure', 4, 2);
    this.registerGridFrames('farm-atlas-v3', 'farm', 4, 4);
    this.registerGridFrames('farm-treasures-v3', 'farm-treasure', 4, 2);
    this.createDogAnimations();
    this.createAnimalAnimations('bunny-animations-v3', 'bunny');
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
    this.createAnimalAnimations('pip-animations-v3', 'pip');
  }

  private createAnimalAnimations(texture: string, prefix: string): void {
    const animation = (key: string, frames: number[], frameRate: number, repeat: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map(frame => ({ key: texture, frame: `${prefix}-${frame}` })),
        frameRate,
        repeat
      });
    };
    animation(`${prefix}-run`, [0, 1, 2, 3], 10, -1);
    animation(`${prefix}-dig`, [4, 5, 6, 7], 8, 1);
    animation(`${prefix}-jump`, [8, 9, 10, 11], 9, 0);
    animation(`${prefix}-action`, [12, 13, 12], 7, 0);
    animation(`${prefix}-idle`, [14, 15], 2, -1);
    if (prefix === 'pip') this.anims.create({ key: 'pip-bark', frames: [{ key: texture, frame: 'pip-12' }, { key: texture, frame: 'pip-13' }, { key: texture, frame: 'pip-12' }], frameRate: 7, repeat: 0 });
  }
}

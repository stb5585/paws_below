import Phaser from 'phaser';
import { TREASURE_SPRITE_FRAMES } from '../data/content';
import type { RunResults } from '../types';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';

export class OwnerReturnScene extends Phaser.Scene {
  constructor() { super('OwnerReturn'); }

  create(): void {
    const results = this.registry.get('lastRun') as RunResults;
    addMenuBackground(this, .3);
    heading(this, 640, 74, 'BACK HOME!', 56);
    this.add.circle(640, 280, 150, 0xffd481, .2);
    this.add.image(640, 280, 'pip-animations-v2', 'pip-15').setDisplaySize(260, 260);
    this.add.text(640, 408, results.treasures.length ? 'Pip brought everything back!' : 'Pip made it safely home!', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '31px', color: '#fff1ca', fontStyle: 'bold'
    }).setOrigin(.5);
    if (results.treasures.length) {
      addPanel(this, 640, 500, Math.max(350, results.treasures.length * 105), 100, .82);
      const gap = 92;
      const firstX = 640 - (results.treasures.length - 1) * gap / 2;
      results.treasures.forEach((item, index) => {
        const reward = item.kind === 'pirate'
          ? this.add.image(firstX + index * gap, 500, 'burrow-atlas-v2', 'env-14').setDisplaySize(74, 74)
          : this.add.image(firstX + index * gap, 500, 'household-treasures-v2', `treasure-${TREASURE_SPRITE_FRAMES[item.id]}`).setDisplaySize(68, 84);
        reward.setAngle((index % 2 ? 1 : -1) * 3);
      });
    }
    createButton(this, 640, 625, 'SEE MY SCORE', () => this.scene.start('Results'), { width: 330, height: 64, icon: '⭐', color: 0xd96545 });
  }
}

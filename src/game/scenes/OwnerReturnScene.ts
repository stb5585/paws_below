import Phaser from 'phaser';
import { FARM_TREASURE_SPRITE_FRAMES, TREASURE_SPRITE_FRAMES } from '../data/content';
import type { RunResults } from '../types';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';
import { getAnimal } from '../data/content';

export class OwnerReturnScene extends Phaser.Scene {
  constructor() { super('OwnerReturn'); }

  create(): void {
    const results = this.registry.get('lastRun') as RunResults;
    const animal = getAnimal(results.animalId);
    addMenuBackground(this, .3);
    const farm = results.mapId === 'farm';
    heading(this, 640, 74, farm ? 'FARM QUEST COMPLETE!' : animal.id === 'cream-bunny' ? 'BACK TO THE PEN!' : 'BACK HOME!', 56);
    this.add.circle(640, 280, 150, 0xffd481, .2);
    const portraitSize = 260 * (animal.portraitScale ?? 1);
    this.add.image(640 + (animal.portraitOffsetX ?? 0) * 1.25, 280 + (animal.portraitOffsetY ?? 0) * 1.25, animal.spriteTexture, `${animal.spriteKey}-15`)
      .setDisplaySize(portraitSize, portraitSize);
    const returnMessage = results.treasures.length
      ? `${animal.displayName} brought everything back!`
      : `${animal.displayName} made it safely to the ${farm ? 'barn' : animal.homeName}!`;
    this.add.text(640, 408, returnMessage, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '31px', color: '#fff1ca', fontStyle: 'bold'
    }).setOrigin(.5);
    if (results.treasures.length) {
      addPanel(this, 640, 500, Math.max(350, results.treasures.length * 105), 100, .82);
      const gap = 92;
      const firstX = 640 - (results.treasures.length - 1) * gap / 2;
      results.treasures.forEach((item, index) => {
        const reward = item.kind === 'pirate'
          ? this.add.image(firstX + index * gap, 500, 'burrow-atlas', 'env-14').setDisplaySize(74, 74)
          : this.add.image(firstX + index * gap, 500, farm ? 'farm-treasures' : 'household-treasures', farm ? `farm-treasure-${FARM_TREASURE_SPRITE_FRAMES[item.id]}` : `treasure-${TREASURE_SPRITE_FRAMES[item.id]}`).setDisplaySize(68, 84);
        reward.setAngle((index % 2 ? 1 : -1) * 3);
      });
    }
    createButton(this, 640, 625, 'SEE MY SCORE', () => this.scene.start('Results'), { width: 330, height: 64, icon: '⭐', color: 0xd96545 });
  }
}

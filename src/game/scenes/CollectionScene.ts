import Phaser from 'phaser';
import { TREASURE_CATALOG, TREASURE_SPRITE_FRAMES } from '../data/content';
import type { PlayerProfile } from '../systems/profile';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';

export class CollectionScene extends Phaser.Scene {
  private from = 'Title';
  constructor() { super('Collection'); }
  init(data: { from?: string }): void { this.from = data.from ?? 'Title'; }

  create(): void {
    addMenuBackground(this, .55);
    const profile = this.registry.get('profile') as PlayerProfile;
    heading(this, 640, 66, 'PIP’S TREASURE BOOK', 48);
    this.add.text(640, 112, `${profile.collection.length} of ${TREASURE_CATALOG.length} things returned`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '22px', color: '#82dfc4'
    }).setOrigin(.5);
    TREASURE_CATALOG.forEach((item, index) => {
      const col = index % 4; const row = Math.floor(index / 4);
      const x = 220 + col * 280; const y = 245 + row * 220;
      const found = profile.collection.includes(item.id);
      addPanel(this, x, y, 230, 180, found ? .95 : .55);
      if (found) {
        this.add.image(x, y - 28, 'household-treasures-v2', `treasure-${TREASURE_SPRITE_FRAMES[item.id]}`)
          .setDisplaySize(86, 108);
      } else {
        this.add.text(x, y - 28, '?', { fontSize: '60px', color: '#fff1ca' }).setOrigin(.5).setAlpha(.45);
      }
      this.add.text(x, y + 42, found ? item.name : 'Still buried…', {
        fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color: found ? '#fff1ca' : '#a88773', fontStyle: 'bold'
      }).setOrigin(.5);
    });
    const badge = addPanel(this, 640, 593, 330, 74, profile.pirateBadge ? .95 : .55);
    badge.setStrokeStyle(4, profile.pirateBadge ? 0xffd35f : 0x755c4d, .8);
    this.add.text(640, 593, profile.pirateBadge ? '🏴‍☠️  PIRATE FINDER' : '🔒  Pirate badge hidden', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '23px', color: profile.pirateBadge ? '#ffdf77' : '#987d6c', fontStyle: 'bold'
    }).setOrigin(.5);
    createButton(this, 115, 650, 'BACK', () => this.scene.start(this.from === 'Results' ? 'Results' : 'Title'), { width: 180, height: 52, fontSize: 21, icon: '←', color: 0x694638 });
  }
}

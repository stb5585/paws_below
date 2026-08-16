import Phaser from 'phaser';
import { FARM_TREASURE_CATALOG, FARM_TREASURE_SPRITE_FRAMES, TREASURE_CATALOG, TREASURE_SPRITE_FRAMES } from '../data/content';
import type { MapId } from '../types';
import type { PlayerProfile } from '../systems/profile';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';

export class CollectionScene extends Phaser.Scene {
  private from = 'Title';
  private page?: MapId;
  constructor() { super('Collection'); }
  init(data: { from?: string; page?: MapId }): void { this.from = data.from ?? 'Title'; this.page = data.page; }

  create(): void {
    addMenuBackground(this, .55);
    const profile = this.registry.get('profile') as PlayerProfile;
    const page = this.page ?? profile.selectedMapId;
    const farm = page === 'farm';
    const catalog = farm ? FARM_TREASURE_CATALOG : TREASURE_CATALOG;
    const foundCount = catalog.filter(item => profile.collection.includes(item.id)).length;
    heading(this, 640, 54, 'TREASURE BOOK', 45);
    createButton(this, 500, 105, 'BURROW FINDS', () => this.scene.restart({from:this.from,page:'underground'}), {width:245,height:44,fontSize:17,icon:'💎',color:farm?0x604338:0x67528d});
    createButton(this, 780, 105, 'FARM FINDS', () => this.scene.restart({from:this.from,page:'farm'}), {width:245,height:44,fontSize:17,icon:'🚜',color:farm?0x579253:0x604338});
    this.add.text(640, 151, `${foundCount} of ${catalog.length} ${farm ? 'farm finds collected' : 'things returned'}`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '22px', color: '#82dfc4'
    }).setOrigin(.5);
    catalog.forEach((item, index) => {
      const col = index % 4; const row = Math.floor(index / 4);
      const x = 220 + col * 280; const y = 265 + row * 205;
      const found = profile.collection.includes(item.id);
      addPanel(this, x, y, 230, 180, found ? .95 : .55);
      if (found) {
        this.add.image(x, y - 28, farm ? 'farm-treasures-v3' : 'household-treasures-v4', farm ? `farm-treasure-${FARM_TREASURE_SPRITE_FRAMES[item.id]}` : `treasure-${TREASURE_SPRITE_FRAMES[item.id]}`)
          .setDisplaySize(86, 108);
      } else {
        this.add.text(x, y - 28, '?', { fontSize: '60px', color: '#fff1ca' }).setOrigin(.5).setAlpha(.45);
      }
      this.add.text(x, y + 42, found ? item.name : 'Still buried…', {
        fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color: found ? '#fff1ca' : '#a88773', fontStyle: 'bold'
      }).setOrigin(.5);
    });
    if (!farm) {
      const badge = addPanel(this, 640, 583, 330, 66, profile.pirateBadge ? .95 : .55);
      badge.setStrokeStyle(4, profile.pirateBadge ? 0xffd35f : 0x755c4d, .8);
      this.add.text(640, 583, profile.pirateBadge ? '🏴‍☠️  PIRATE FINDER' : '🔒  Pirate badge hidden', {
        fontFamily: 'Fredoka, sans-serif', fontSize: '23px', color: profile.pirateBadge ? '#ffdf77' : '#987d6c', fontStyle: 'bold'
      }).setOrigin(.5);
    }
    createButton(this, 115, 665, 'BACK', () => this.scene.start(this.from === 'Results' ? 'Results' : 'Title'), { width: 180, height: 48, fontSize: 20, icon: '←', color: 0x694638 });
  }
}

import Phaser from 'phaser';
import type { RunResults } from '../types';
import type { PlayerProfile } from '../systems/profile';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(): void {
    const result = this.registry.get('lastRun') as RunResults | undefined;
    if (!result) { this.scene.start('Title'); return; }
    const profile = this.registry.get('profile') as PlayerProfile;
    addMenuBackground(this, .56);
    heading(this, 640, 76, result.isBest ? 'NEW BEST!' : 'BURROW COMPLETE!', 56);
    addPanel(this, 640, 312, 670, 370, .95);
    this.add.text(640, 190, result.score.toLocaleString(), {
      fontFamily: 'Fredoka, sans-serif', fontSize: '88px', color: '#ffdb72', fontStyle: 'bold', stroke: '#5a311d', strokeThickness: 6
    }).setOrigin(.5);
    this.add.text(640, 258, `BEST  ${profile.bestScore.toLocaleString()}`, { fontFamily: 'Fredoka, sans-serif', fontSize: '24px', color: '#82dfc4' }).setOrigin(.5);
    this.add.text(460, 340, `🍖  ${result.foodFound} / 30`, { fontFamily: 'Fredoka, sans-serif', fontSize: '30px', color: '#fff1ca' }).setOrigin(.5);
    this.add.text(820, 340, `✨  ${result.treatsFound} / 6`, { fontFamily: 'Fredoka, sans-serif', fontSize: '30px', color: '#fff1ca' }).setOrigin(.5);
    this.add.text(460, 405, `🦴  ${result.treasures.filter(t => t.kind === 'ordinary').length} / 4`, { fontFamily: 'Fredoka, sans-serif', fontSize: '30px', color: '#fff1ca' }).setOrigin(.5);
    this.add.text(820, 405, result.pirateFound ? '🏴‍☠️  FOUND!' : '🏴‍☠️  Still hidden', { fontFamily: 'Fredoka, sans-serif', fontSize: '28px', color: result.pirateFound ? '#ffda68' : '#a98d78' }).setOrigin(.5);
    createButton(this, 450, 576, 'PLAY AGAIN', () => this.scene.start('Maze'), { width: 290, icon: '🐾', color: 0xd96545 });
    createButton(this, 830, 576, 'TREASURE BOOK', () => this.scene.start('Collection', { from: 'Results' }), { width: 300, icon: '🦴', color: 0x418b81, fontSize: 24 });
    createButton(this, 640, 650, 'HOME', () => this.scene.start('Title'), { width: 220, height: 50, icon: '🏠', color: 0x694638, fontSize: 21 });
  }
}

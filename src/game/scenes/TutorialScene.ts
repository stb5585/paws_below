import Phaser from 'phaser';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';
import type { PlayerProfile } from '../systems/profile';
import { saveProfile } from '../systems/profile';

export class TutorialScene extends Phaser.Scene {
  constructor() { super('Tutorial'); }

  create(): void {
    addMenuBackground(this, .46);
    heading(this, 640, 75, 'HOW TO PLAY', 52);
    const cards = [
      { x: 215, frame: 'pip-1', title: 'RUN', body: 'Arrow keys / WASD\nor the touch stick' },
      { x: 500, frame: 'pip-9', title: 'JUMP', body: 'Press SPACE to hop\nor cross the stones' },
      { x: 785, frame: 'pip-6', title: 'DIG', body: 'Press E when the\nground wiggles' },
      { x: 1070, frame: 'pip-12', title: 'BARK!', body: 'Press B whenever\nyou feel happy' }
    ];
    cards.forEach(card => {
      addPanel(this, card.x, 310, 245, 350, .94);
      this.add.image(card.x, 218, 'pip-animations-v2', card.frame).setDisplaySize(132, 132);
      this.add.text(card.x, 292, card.title, { fontFamily: 'Fredoka, sans-serif', fontSize: '32px', color: '#ffe5ae', fontStyle: 'bold' }).setOrigin(.5);
      this.add.text(card.x, 365, card.body, { fontFamily: 'Fredoka, sans-serif', fontSize: '22px', color: '#f9dfbf', align: 'center', lineSpacing: 8 }).setOrigin(.5);
    });
    this.add.text(640, 515, '🍖 Find snacks  •  ✨ Try treats  •  🏠 Reach the doghouse', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '27px', color: '#8de0cb', fontStyle: 'bold'
    }).setOrigin(.5);
    createButton(this, 640, 625, "LET'S GO!", () => {
      const profile = this.registry.get('profile') as PlayerProfile;
      profile.tutorialSeen = true; saveProfile(profile);
      this.scene.start('Maze');
    }, { width: 320, height: 75, icon: '🐾', color: 0xd96545 });
  }
}

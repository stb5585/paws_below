import Phaser from 'phaser';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';
import type { PlayerProfile } from '../systems/profile';
import { saveProfile } from '../systems/profile';
import { shouldShowTouchControls } from '../systems/device';
import { getAnimal, getLevelForAnimal } from '../data/content';

export class TutorialScene extends Phaser.Scene {
  constructor() { super('Tutorial'); }

  create(): void {
    addMenuBackground(this, .46);
    const profile = this.registry.get('profile') as PlayerProfile;
    const animal = getAnimal(profile.selectedAnimalId);
    const level = getLevelForAnimal(animal.id, profile.selectedMapId);
    const touchActive = shouldShowTouchControls(profile.touchControls);
    heading(this, 640, 75, 'HOW TO PLAY', 52);
    const cards = [
      { x: 215, frame: `${animal.spriteKey}-1`, title: 'RUN', body: touchActive ? (profile.touchMovement === 'follow' ? `Hold and drag where\nyou want ${animal.displayName} to run` : `Use the touch stick\nto guide ${animal.displayName}`) : `Arrow keys / WASD\nto guide ${animal.displayName}` },
      { x: 500, frame: `${animal.spriteKey}-9`, title: 'JUMP', body: touchActive ? 'Tap JUMP to hop\nover low obstacles' : 'Press SPACE to hop\nover low obstacles' },
      { x: 785, frame: `${animal.spriteKey}-6`, title: 'DIG', body: touchActive ? 'Tap DIG anywhere—\nwatch for wiggly soil!' : 'Press E anywhere—\nwatch for wiggly soil!' },
      { x: 1070, frame: `${animal.spriteKey}-12`, title: `${animal.actionLabel}!`, body: touchActive ? `Tap ${animal.actionLabel} near treasure\nto reveal its arrow` : `Press B near treasure\nto reveal its arrow` }
    ];
    cards.forEach(card => {
      addPanel(this, card.x, 310, 245, 350, .94);
      const tutorialSize = 132 * (animal.portraitScale ?? 1);
      this.add.image(card.x + (animal.portraitOffsetX ?? 0) * .4, 218 + (animal.portraitOffsetY ?? 0) * .4, animal.spriteTexture, card.frame)
        .setDisplaySize(tutorialSize, tutorialSize);
      this.add.text(card.x, 292, card.title, { fontFamily: 'Fredoka, sans-serif', fontSize: '32px', color: '#ffe5ae', fontStyle: 'bold' }).setOrigin(.5);
      this.add.text(card.x, 365, card.body, { fontFamily: 'Fredoka, sans-serif', fontSize: '22px', color: '#f9dfbf', align: 'center', lineSpacing: 8 }).setOrigin(.5);
    });
    const goalText = level.goal.type === 'collectThenReachExit'
      ? `${animal.foodIcon} Find ${level.goal.target} farm foods  •  ✨ Try treats  •  🏡 Reach the barn`
      : `${animal.foodIcon} Find snacks  •  ✨ Try treats  •  🏠 Reach the ${animal.homeName}`;
    this.add.text(640, 515, goalText, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '27px', color: '#8de0cb', fontStyle: 'bold'
    }).setOrigin(.5);
    createButton(this, 640, 625, "LET'S GO!", () => {
      profile.tutorialSeen = true;
      profile.seenAnimals = [...new Set([...profile.seenAnimals, animal.id])];
      profile.seenLevels = [...new Set([...profile.seenLevels, `${animal.id}:${level.mapId}`])];
      saveProfile(profile);
      this.scene.start('Maze');
    }, { width: 320, height: 75, icon: '🐾', color: 0xd96545 });
  }
}

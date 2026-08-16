import Phaser from 'phaser';
import { ANIMALS } from '../data/content';
import type { Soundscape } from '../systems/audio';
import type { PlayerProfile } from '../systems/profile';
import { animalBestScore, saveProfile } from '../systems/profile';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';

export class AnimalSelectScene extends Phaser.Scene {
  constructor() { super('AnimalSelect'); }

  create(): void {
    addMenuBackground(this, .48);
    heading(this, 640, 68, 'CHOOSE YOUR ANIMAL', 52);
    this.add.text(640, 116, 'Each friend has a different adventure!', {
      fontFamily:'Fredoka, sans-serif',fontSize:'24px',color:'#b9ffe9',fontStyle:'bold'
    }).setOrigin(.5);
    const profile = this.registry.get('profile') as PlayerProfile;
    const sound = this.registry.get('soundscape') as Soundscape;

    ANIMALS.forEach((animal, index) => {
      const x = index === 0 ? 390 : 890;
      addPanel(this, x, 355, 410, 430, .94).setStrokeStyle(5, animal.id === profile.selectedAnimalId ? 0xffdc72 : 0x82dfc4, .9);
      this.add.circle(x, 272, 108, animal.id === 'white-dog' ? 0xffd48d : 0xb6e7b2, .17);
      const portraitSize = 205 * (animal.portraitScale ?? 1);
      this.add.image(x + (animal.portraitOffsetX ?? 0), 272 + (animal.portraitOffsetY ?? 0), animal.spriteTexture, `${animal.spriteKey}-15`)
        .setDisplaySize(portraitSize, portraitSize);
      this.add.text(x, 166, `${animal.actionIcon}  ${animal.displayName}`, {
        fontFamily:'Fredoka, sans-serif',fontSize:'34px',color:'#fff1ca',fontStyle:'bold'
      }).setOrigin(.5);
      const goal = animal.id === 'white-dog'
        ? 'A playful treasure-sniffer\nwith a cheerful bark'
        : 'A speedy farm-food finder\nwith a mighty honk';
      this.add.text(x, 405, goal, {
        fontFamily:'Fredoka, sans-serif',fontSize:'22px',color:'#f9dfbf',fontStyle:'bold',align:'center',lineSpacing:7
      }).setOrigin(.5);
      this.add.text(x, 470, `BEST  ${animalBestScore(profile, animal.id).toLocaleString()}`, {
        fontFamily:'Fredoka, sans-serif',fontSize:'19px',color:'#82dfc4',fontStyle:'bold'
      }).setOrigin(.5);
      createButton(this, x, 530, `PLAY AS ${animal.displayName.toUpperCase()}`, () => {
        sound.click(); profile.selectedAnimalId = animal.id; saveProfile(profile);
        this.scene.start('MapSelect');
      }, { width: 330, height: 62, fontSize: 22, icon: animal.actionIcon, color: animal.id === 'white-dog' ? 0xd96545 : 0x5b9b67 });
    });
    createButton(this, 120, 660, 'BACK', () => this.scene.start('Title'), { width:180,height:48,fontSize:20,icon:'←',color:0x694638 });
  }
}

import Phaser from 'phaser';
import { getAnimal } from '../data/content';
import { WORLDS } from '../data/worlds';
import type { Soundscape } from '../systems/audio';
import type { PlayerProfile } from '../systems/profile';
import { saveProfile } from '../systems/profile';
import { addMenuBackground, addPanel, createButton, heading } from '../ui';

export class MapSelectScene extends Phaser.Scene {
  constructor() { super('MapSelect'); }

  create(): void {
    addMenuBackground(this, .48, 'title-animals');
    const profile = this.registry.get('profile') as PlayerProfile;
    const sound = this.registry.get('soundscape') as Soundscape;
    const animal = getAnimal(profile.selectedAnimalId);
    heading(this, 640, 65, 'CHOOSE A MAP', 52);
    this.add.text(640, 112, `${animal.actionIcon} ${animal.displayName} is ready for an adventure!`, {
      fontFamily:'Fredoka, sans-serif',fontSize:'24px',color:'#b9ffe9',fontStyle:'bold'
    }).setOrigin(.5);

    WORLDS.forEach((world, index) => {
      const x = index === 0 ? 390 : 890;
      const selected = world.id === profile.selectedMapId;
      addPanel(this, x, 350, 420, 430, .95).setStrokeStyle(5, selected ? 0xffdc72 : 0x82dfc4, .92);
      this.add.circle(x, 258, 112, world.theme === 'farm' ? 0x91c967 : 0x7a5238, .25);
      this.add.text(x, 260, world.theme === 'farm' ? '🚜' : '💎', { fontSize: '92px' }).setOrigin(.5);
      this.add.text(x, 172, world.title.toUpperCase(), {
        fontFamily:'Fredoka, sans-serif',fontSize:'31px',color:'#fff1ca',fontStyle:'bold',stroke:'#2c1711',strokeThickness:5
      }).setOrigin(.5);
      this.add.text(x, 405, world.subtitle, {
        fontFamily:'Fredoka, sans-serif',fontSize:'20px',color:'#f9dfbf',fontStyle:'bold',align:'center',wordWrap:{width:350},lineSpacing:6
      }).setOrigin(.5);
      this.add.text(x, 470, world.theme === 'farm' ? '🥕 COLLECTION QUEST  •  🚜 NEW FINDS' : '🏠 FIND HOME  •  🏴‍☠️ PIRATE CHEST', {
        fontFamily:'Fredoka, sans-serif',fontSize:'17px',color:'#82dfc4',fontStyle:'bold',align:'center'
      }).setOrigin(.5);
      createButton(this, x, 535, 'CHOOSE THIS MAP', () => {
        sound.click(); profile.selectedMapId = world.id; saveProfile(profile);
        const destination = profile.seenLevels.includes(`${animal.id}:${world.id}`) ? 'Maze' : 'Tutorial';
        this.scene.start(destination === 'Maze' ? 'GameLoad' : destination, destination === 'Maze' ? { destination } : undefined);
      }, { width:330,height:62,fontSize:22,icon:world.theme === 'farm' ? '🚜' : '💎',color:world.theme === 'farm' ? 0x5e9858 : 0x68558c });
    });
    createButton(this, 120, 660, 'BACK', () => this.scene.start('AnimalSelect'), { width:180,height:48,fontSize:20,icon:'←',color:0x694638 });
  }
}

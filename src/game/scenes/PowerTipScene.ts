import Phaser from 'phaser';
import { POWERS } from '../data/content';
import type { PowerKind } from '../types';
import type { Soundscape } from '../systems/audio';
import { addPanel, addViewportShade, createButton, heading } from '../ui';

export class PowerTipScene extends Phaser.Scene {
  private kind: PowerKind = 'zoomie';
  private dismissed = false;

  constructor() { super('PowerTip'); }

  init(data: { kind?: PowerKind }): void {
    this.dismissed = false;
    if (data.kind === 'zoomie' || data.kind === 'glow' || data.kind === 'sniff') this.kind = data.kind;
  }

  create(): void {
    const power = POWERS[this.kind];
    addViewportShade(this, 0x120a08, .78).setDepth(0);
    addPanel(this, 640, 355, 700, 540, .98).setDepth(1);
    heading(this, 640, 155, 'YOU FOUND A POWER!', 38).setDepth(2);
    this.add.text(640, 245, power.icon, { fontSize: '76px' }).setOrigin(.5).setDepth(2);
    this.add.text(640, 315, power.label, {
      fontFamily:'Fredoka, sans-serif',fontSize:'36px',color:`#${power.color.toString(16).padStart(6, '0')}`,
      fontStyle:'bold',stroke:'#301a13',strokeThickness:6
    }).setOrigin(.5).setDepth(2);
    this.add.text(640, 365, power.summary, {
      fontFamily:'Fredoka, sans-serif',fontSize:'25px',color:'#fff1ca',fontStyle:'bold',align:'center'
    }).setOrigin(.5).setDepth(2);
    this.add.text(640, 405, `LASTS ${power.durationMs / 1000} SECONDS`, {
      fontFamily:'Fredoka, sans-serif',fontSize:'18px',color:`#${power.color.toString(16).padStart(6, '0')}`,fontStyle:'bold'
    }).setOrigin(.5).setDepth(2);
    this.add.text(640, 455, power.detail, {
      fontFamily:'Fredoka, sans-serif',fontSize:'18px',color:'#d9c3ad',align:'center',wordWrap:{width:570},lineSpacing:5
    }).setOrigin(.5).setDepth(2);
    createButton(this, 640, 555, "LET'S GO!", this.dismiss, {
      width:300,height:64,fontSize:26,icon:'▶',color:power.color
    }).setDepth(2);
    this.add.text(640, 605, 'PRESS ENTER OR TAP', {
      fontFamily:'Fredoka, sans-serif',fontSize:'15px',color:'#bfa995',fontStyle:'bold'
    }).setOrigin(.5).setDepth(2);
    this.input.keyboard?.once('keydown-ENTER', this.dismiss);
    this.input.keyboard?.once('keydown-ESC', this.dismiss);
  }

  private dismiss = (): void => {
    if (this.dismissed) return;
    this.dismissed = true;
    (this.registry.get('soundscape') as Soundscape | undefined)?.click();
    this.scene.stop();
    this.scene.resume('Maze');
  };
}

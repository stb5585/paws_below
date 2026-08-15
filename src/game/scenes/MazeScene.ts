import Phaser from 'phaser';
import { BURROW, DOG, POWERS, TREASURE_SPRITE_FRAMES, ZOOMIE_SPEED_MULTIPLIER } from '../data/content';
import {
  BLOCKS, COLLECTIBLES, JUMP_PATHS, LAVA_RECTS, ORDINARY_DIG_SPOTS, PIRATE_DIG_SPOTS,
  ROOMS, TILE_H, TILE_W, gridToWorld, isFloorCell, isLavaCell, pointInRect
} from '../data/level';
import type { ActiveDigSpot, CollectibleDefinition, GridPoint, PlayerActions, PowerKind, RunResults } from '../types';
import { addDiscoveries, saveProfile, type PlayerProfile } from '../systems/profile';
import { RunState } from '../systems/runState';
import { activateDigSpots } from '../systems/treasure';
import type { Soundscape } from '../systems/audio';
import { shouldShowTouchControls } from '../systems/device';

interface PlayerModel extends GridPoint { jumpLift: number }
interface TileView { point: GridPoint; object: Phaser.GameObjects.Shape | Phaser.GameObjects.Image; discovered: boolean }
interface CollectibleView { definition: CollectibleDefinition; object: Phaser.GameObjects.Container; collected: boolean }
interface DigView { spot: ActiveDigSpot; object: Phaser.GameObjects.Container }

const COLORS = {
  floorA: 0x8d5d3d, floorB: 0x7b4c35, floorEdge: 0x4d2d23,
  wallTop: 0x5b3628, wallSide: 0x362019
};

export class MazeScene extends Phaser.Scene {
  private player: PlayerModel = { ...BURROW.start, jumpLift: 0 };
  private dog!: Phaser.GameObjects.Container;
  private dogSprite!: Phaser.GameObjects.Sprite;
  private barkBubble!: Phaser.GameObjects.Text;
  private run = new RunState();
  private profile!: PlayerProfile;
  private audio!: Soundscape;
  private tileViews: TileView[] = [];
  private collectibleViews: CollectibleView[] = [];
  private digViews: DigView[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private digPrompt!: Phaser.GameObjects.Container;
  private jumpPrompt!: Phaser.GameObjects.Container;
  private powerHud = new Map<PowerKind, Phaser.GameObjects.Container>();
  private hint!: Phaser.GameObjects.Container;
  private lastDiscovery = 0;
  private visited = new Set<string>();
  private lastMove = new Phaser.Math.Vector2(1, 0);
  private busy = false;
  private finished = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private touchVector = new Phaser.Math.Vector2();
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickPointer?: number;
  private queued = { jump: false, dig: false, bark: false, pause: false };
  private touchUi: Array<Phaser.GameObjects.Arc | Phaser.GameObjects.Text> = [];
  private mapMeta?: Phaser.Tilemaps.Tilemap;

  constructor() { super('Maze'); }

  create(): void {
    this.profile = this.registry.get('profile') as PlayerProfile;
    this.audio = this.registry.get('soundscape') as Soundscape;
    this.player = { ...BURROW.start, jumpLift: 0 };
    this.run = new RunState();
    this.tileViews = []; this.collectibleViews = []; this.digViews = [];
    this.visited.clear(); this.busy = false; this.finished = false;
    this.lastDiscovery = this.time.now;
    this.mapMeta = this.make.tilemap({ key: BURROW.mapKey });

    this.cameras.main.setBackgroundColor('#170e0b');
    this.cameras.main.setBounds(0, 0, 3500, 1650);
    this.drawWorld();
    this.createCollectibles();
    this.createDigSpots();
    this.createExit();
    this.createDog();
    this.createHud();
    this.createKeyboard();
    this.createTouchControls();
    this.cameras.main.startFollow(this.dog, true, .075, .075);
    this.cameras.main.setZoom(1.06);

    this.game.events.on('brightness-changed', this.updateVisibility, this);
    this.game.events.on('touch-controls-changed', this.syncTouchControls, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('brightness-changed', this.updateVisibility, this);
      this.game.events.off('touch-controls-changed', this.syncTouchControls, this);
    });
  }

  update(time: number, delta: number): void {
    if (this.finished) return;
    const actions = this.readActions();
    if (actions.pause) { this.scene.pause(); this.scene.launch('Pause'); return; }
    if (actions.bark) this.bark();
    if (actions.dig) this.tryDig();
    if (actions.jump) this.tryJump(actions.moveX, actions.moveY);
    if (!this.busy) this.movePlayer(actions.moveX, actions.moveY, time, delta);
    this.positionDog(time, actions.moveX !== 0 || actions.moveY !== 0);
    this.collectNearby(time);
    this.updateDiscovery(time);
    this.updateVisibility();
    this.updateHud(time);
    this.checkExit();
    this.queued = { jump: false, dig: false, bark: false, pause: false };
  }

  private drawWorld(): void {
    const stoneKeys = new Set(JUMP_PATHS.flat().map(point => `${point.x},${point.y}`));
    const lavaLayer = this.add.graphics().setDepth(2);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 34; x++) {
        if (!isFloorCell(x, y) && !isLavaCell(x, y)) continue;
        const point = { x, y }; const world = gridToWorld(point);
        const lava = isLavaCell(x, y);
        if (lava) {
          this.drawLavaTile(lavaLayer, point);
          if (stoneKeys.has(`${x},${y}`)) this.drawStone(point);
          continue;
        }
        const color = (x + y) % 2 ? COLORS.floorA : COLORS.floorB;
        const base = this.add.polygon(world.x, world.y, [0,-TILE_H/2,TILE_W/2,0,0,TILE_H/2,-TILE_W/2,0], color, 1)
          .setStrokeStyle(1, COLORS.floorEdge, .45).setDepth(world.y);
        const diamond = this.add.image(world.x, world.y - 4, 'burrow-atlas-v2', 'env-0')
          .setDisplaySize(112, 112).setDepth(world.y + 1);
        this.tileViews.push({ point, object: base, discovered: false }, { point, object: diamond, discovered: false });
      }
    }
    this.tweens.add({ targets: lavaLayer, alpha: { from: .86, to: 1 }, duration: 980, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.drawWalls();
    this.drawDecor();
  }

  private drawLavaTile(layer: Phaser.GameObjects.Graphics, point: GridPoint): void {
    const world = gridToWorld(point);
    const diamond = (halfWidth: number, halfHeight: number) => [
      new Phaser.Geom.Point(world.x, world.y - halfHeight),
      new Phaser.Geom.Point(world.x + halfWidth, world.y),
      new Phaser.Geom.Point(world.x, world.y + halfHeight),
      new Phaser.Geom.Point(world.x - halfWidth, world.y)
    ];
    layer.fillStyle(0x762018, 1).fillPoints(diamond(48, 24), true);
    layer.lineStyle(1, 0x43130f, .9).strokePoints(diamond(47.5, 23.5), true);
    layer.fillStyle((point.x + point.y) % 2 ? 0xf04427 : 0xdd3520, 1).fillPoints(diamond(46, 21.5), true);
    layer.fillStyle(0xff6a2c, .58).fillPoints(diamond(40, 17), true);

    const flip = (point.x * 17 + point.y * 29) % 2 ? 1 : -1;
    layer.lineStyle(2, 0xffc24a, .82);
    layer.beginPath();
    layer.moveTo(world.x - 30, world.y - 4 * flip);
    layer.lineTo(world.x - 10, world.y + 3 * flip);
    layer.lineTo(world.x + 4, world.y - 3 * flip);
    layer.lineTo(world.x + 28, world.y + 5 * flip);
    layer.strokePath();
    layer.lineStyle(1, 0xffe27a, .65);
    layer.beginPath();
    layer.moveTo(world.x - 5, world.y - 12);
    layer.lineTo(world.x + 8, world.y - 4);
    layer.lineTo(world.x + 18, world.y - 7);
    layer.strokePath();
    layer.fillStyle(0xffd45a, .72);
    layer.fillCircle(world.x - 21 * flip, world.y + 4, 2.4);
    layer.fillCircle(world.x + 18 * flip, world.y - 2, 1.7);
  }

  private drawStone(point: GridPoint): void {
    const world = gridToWorld(point);
    // Crossing stones must render above every isometric lava tile. Using a
    // dedicated foreground depth prevents later tiles in the draw order from
    // covering the rock sprite while still keeping Puppy above it.
    const stone = this.add.image(world.x, world.y - 9, 'burrow-atlas-v2', 'env-3')
      .setDisplaySize(80, 80)
      .setDepth(6500);
    this.tileViews.push({ point, object: stone, discovered: false });
  }

  private drawWalls(): void {
    const wallCells = new Set<string>();
    const addWall = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= 34 || y >= 24 || isFloorCell(x, y) || isLavaCell(x, y)) return;
      wallCells.add(`${x},${y}`);
    };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 34; x++) if (isFloorCell(x, y) || isLavaCell(x, y)) {
      addWall(x + 1, y); addWall(x - 1, y); addWall(x, y + 1); addWall(x, y - 1);
    }
    wallCells.forEach(key => {
      const [x, y] = key.split(',').map(Number); const world = gridToWorld({x,y});
      const wall = this.add.image(world.x, world.y - 31, 'burrow-atlas-v2', 'env-1').setDisplaySize(118, 118).setDepth(world.y + 21);
      this.tileViews.push({ point: {x,y}, object: wall, discovered: false });
    });
    BLOCKS.forEach(block => {
      const point = {x:block.x + block.width / 2, y:block.y + block.height / 2};
      const p = gridToWorld(point);
      const rock = this.add.image(p.x, p.y - 38, 'burrow-atlas-v2', 'env-1')
        .setDisplaySize(Math.max(118, block.width * 78), Math.max(118, block.height * 84)).setDepth(p.y + 25);
      this.tileViews.push({ point, object: rock, discovered: false });
    });
  }

  private drawDecor(): void {
    const decor: Array<GridPoint & { frame: number; size: number }> = [
      {x:2,y:2,frame:5,size:72},{x:8,y:3,frame:15,size:64},{x:13,y:1,frame:6,size:74},
      {x:18,y:9,frame:13,size:63},{x:21,y:1,frame:6,size:82},{x:31,y:8,frame:5,size:76},
      {x:22,y:13,frame:15,size:62},{x:32,y:21,frame:6,size:80},{x:10,y:13,frame:7,size:82},
      {x:19,y:21,frame:5,size:76},{x:30,y:1,frame:7,size:68},{x:11,y:20,frame:15,size:58}
    ];
    decor.forEach(item => {
      const world = gridToWorld(item);
      const image = this.add.image(world.x, world.y - item.size * .42, 'burrow-atlas-v2', `env-${item.frame}`)
        .setDisplaySize(item.size, item.size).setDepth(world.y + 30);
      if (item.frame === 5 || item.frame === 6 || item.frame === 15) {
        this.tweens.add({targets:image,alpha:{from:.82,to:1},scaleX:{from:image.scaleX*.96,to:image.scaleX*1.04},scaleY:{from:image.scaleY*.96,to:image.scaleY*1.04},duration:1100+item.x*17,yoyo:true,repeat:-1});
      }
    });
  }

  private createCollectibles(): void {
    COLLECTIBLES.forEach(definition => {
      const world = gridToWorld(definition.position);
      const shadow = this.add.ellipse(0, 13, 38, 14, 0x1b100c, .5);
      const frame = definition.kind === 'food' ? 8 : definition.power === 'zoomie' ? 9 : definition.power === 'glow' ? 10 : 11;
      const icon = this.add.image(0, -5, 'burrow-atlas-v2', `env-${frame}`).setDisplaySize(definition.kind === 'food' ? 44 : 55, definition.kind === 'food' ? 44 : 55);
      const container = this.add.container(world.x, world.y - 22, [shadow, icon]).setDepth(world.y + 40);
      this.tweens.add({ targets: icon, y: '-=8', angle: {from:-3,to:3}, duration: 700 + definition.position.x * 13, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.collectibleViews.push({ definition, object: container, collected: false });
    });
  }

  private createDigSpots(): void {
    const active = activateDigSpots(ORDINARY_DIG_SPOTS, PIRATE_DIG_SPOTS, this.profile.collection);
    active.forEach(spot => {
      const world = gridToWorld(spot);
      const mound = this.add.image(0, -7, 'burrow-atlas-v2', 'env-12').setDisplaySize(74,74);
      const glint = this.add.text(0, -32, '✦', { fontSize: '20px', color: '#ffd978', stroke:'#5e351c', strokeThickness:3 }).setOrigin(.5).setAlpha(.6);
      const object = this.add.container(world.x, world.y + 1, [mound, glint]).setDepth(world.y + 32);
      this.tweens.add({ targets: glint, alpha: {from:.25,to:.9}, scale: {from:.8,to:1.2}, duration: 900, yoyo: true, repeat: -1 });
      this.digViews.push({ spot, object });
    });
  }

  private createExit(): void {
    const world = gridToWorld(BURROW.exit);
    const glow = this.add.circle(world.x, world.y - 64, 96, 0xffc45f, .2).setDepth(world.y + 20);
    this.tweens.add({ targets: glow, scale: {from:.85,to:1.15}, alpha:{from:.12,to:.25}, duration:1200,yoyo:true,repeat:-1 });
    this.add.image(world.x, world.y - 66, 'burrow-atlas-v2', 'env-4').setDisplaySize(180,180).setDepth(world.y + 80);
  }

  private createDog(): void {
    const shadow = this.add.ellipse(0, 18, 78, 25, 0x100907, .52);
    this.dogSprite = this.add.sprite(0, -30, 'pip-animations-v2', 'pip-14').setDisplaySize(128,128);
    this.dogSprite.play('pip-idle');
    this.dog = this.add.container(0, 0, [shadow, this.dogSprite]).setDepth(7000);
    this.barkBubble = this.add.text(0, -105, 'WOOF!', {
      fontFamily:'Fredoka, sans-serif',fontSize:'25px',color:'#fff3c9',fontStyle:'bold',stroke:'#4a281d',strokeThickness:5
    }).setOrigin(.5).setAlpha(0);
    this.dog.add(this.barkBubble);
    this.positionDog(0, false);
  }

  private createHud(): void {
    const hudBg = this.add.rectangle(170, 54, 300, 78, 0x2b1913, .9).setStrokeStyle(3, 0xf2c47a, .55).setScrollFactor(0).setDepth(10000);
    this.scoreText = this.add.text(58, 53, '🍖  0', { fontFamily:'Fredoka, sans-serif',fontSize:'29px',color:'#fff1ca',fontStyle:'bold' }).setOrigin(0,.5).setScrollFactor(0).setDepth(10001);
    const best = this.add.text(274, 55, `BEST\n${this.profile.bestScore}`, {fontFamily:'Fredoka, sans-serif',fontSize:'15px',align:'center',color:'#82dfc4'}).setOrigin(.5).setScrollFactor(0).setDepth(10001);
    void hudBg; void best;
    (Object.keys(POWERS) as PowerKind[]).forEach((kind, index) => {
      const x = 500 + index * 145;
      const bg = this.add.rectangle(0, 0, 128, 55, 0x2b1913, .82).setStrokeStyle(2, POWERS[kind].color, .5);
      const icon = this.add.text(-43, 0, kind === 'zoomie' ? '⚡' : kind === 'glow' ? '☀' : '👃', {fontSize:'26px'}).setOrigin(.5);
      const text = this.add.text(10, 0, '', {fontFamily:'Fredoka, sans-serif',fontSize:'17px',color:'#fff1ca',fontStyle:'bold'}).setOrigin(.5);
      const container = this.add.container(x, 50, [bg,icon,text]).setScrollFactor(0).setDepth(10001).setAlpha(.3);
      this.powerHud.set(kind, container);
    });
    this.hint = this.add.container(0, 0).setDepth(8000).setAlpha(0);
    const hintBg = this.add.rectangle(0, 0, 215, 54, 0x362018, .88).setStrokeStyle(3, 0x82dfc4, .7);
    const hintText = this.add.text(0, 0, '🐾  This way!  ➜', {fontFamily:'Fredoka, sans-serif',fontSize:'22px',color:'#b9ffe9',fontStyle:'bold'}).setOrigin(.5);
    this.hint.add([hintBg,hintText]);
    this.jumpPrompt = this.makePrompt('SPACE', 'JUMP', 0xf07954);
    this.digPrompt = this.makePrompt('E', 'DIG', 0x5a9b75);
  }

  private makePrompt(key: string, label: string, color: number): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 145, 46, 0x24140f, .92).setStrokeStyle(3, color, .85);
    const text = this.add.text(0, 0, `${key}  ${label}`, {fontFamily:'Fredoka, sans-serif',fontSize:'19px',color:'#fff1ca',fontStyle:'bold'}).setOrigin(.5);
    return this.add.container(640, 640, [bg,text]).setScrollFactor(0).setDepth(10002).setAlpha(0);
  }

  private createKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = keyboard.addKeys({
      up:'UP',down:'DOWN',left:'LEFT',right:'RIGHT',w:'W',a:'A',s:'S',d:'D',
      jump:'SPACE',dig:'E',bark:'B',pause:'ESC',confirm:'ENTER'
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private createTouchControls(): void {
    if (!shouldShowTouchControls(this.profile.touchControls)) return;
    this.buildTouchControls();
  }

  private syncTouchControls = (): void => {
    const shouldShow = shouldShowTouchControls(this.profile.touchControls);
    if (shouldShow && this.touchUi.length === 0) this.buildTouchControls();
    this.touchUi.forEach(object => {
      object.setVisible(shouldShow);
      const interactive = object as Phaser.GameObjects.GameObject & { input?: { enabled: boolean } };
      if (interactive.input) interactive.input.enabled = shouldShow;
    });
  };

  private buildTouchControls(): void {
    const base = this.add.circle(135, 575, 82, 0x2b1913, .65).setStrokeStyle(5, 0xffe2aa, .5).setScrollFactor(0).setDepth(11000)
      .setInteractive(new Phaser.Geom.Circle(82,82,90), Phaser.Geom.Circle.Contains);
    const knob = this.add.circle(135, 575, 36, 0xffe1aa, .72).setScrollFactor(0).setDepth(11001);
    this.joystickKnob = knob; this.touchUi.push(base, knob);
    const updateStick = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointer) return;
      const vector = new Phaser.Math.Vector2(pointer.x - 135, pointer.y - 575);
      if (vector.length() > 70) vector.setLength(70);
      this.touchVector.copy(vector).scale(1 / 70);
      knob.setPosition(135 + vector.x, 575 + vector.y);
    };
    base.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.joystickPointer = pointer.id; updateStick(pointer); });
    this.input.on('pointermove', updateStick);
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointer) { this.joystickPointer = undefined; this.touchVector.set(0); knob.setPosition(135,575); }
    });
    this.touchAction(1120, 570, 68, '🐾', 'JUMP', () => this.queued.jump = true, 0xd96545);
    this.touchAction(970, 625, 52, '🦴', 'DIG', () => this.queued.dig = true, 0x4f9275);
    this.touchAction(1220, 655, 46, '🐶', 'BARK', () => this.queued.bark = true, 0x6e518d);
    this.touchAction(1228, 52, 34, 'Ⅱ', '', () => this.queued.pause = true, 0x604338);
  }

  private touchAction(x:number,y:number,radius:number,icon:string,label:string,action:()=>void,color:number): void {
    const circle = this.add.circle(x,y,radius,color,.82).setStrokeStyle(4,0xffedc5,.65).setScrollFactor(0).setDepth(11000).setInteractive({useHandCursor:true});
    const iconText = this.add.text(x,y - (label ? 8 : 0),icon,{fontSize:`${Math.round(radius*.72)}px`,fontFamily:'Fredoka, sans-serif',fontStyle:'bold'}).setOrigin(.5).setScrollFactor(0).setDepth(11001);
    const labelText = this.add.text(x,y+radius*.48,label,{fontSize:'13px',fontFamily:'Fredoka, sans-serif',fontStyle:'bold',color:'#fff1ca'}).setOrigin(.5).setScrollFactor(0).setDepth(11001);
    circle.on('pointerdown',()=>{circle.setScale(.92);action();}); circle.on('pointerup',()=>circle.setScale(1));
    this.touchUi.push(circle,iconText,labelText);
  }

  private readActions(): PlayerActions {
    const down = (key: string) => this.keys?.[key]?.isDown ?? false;
    const just = (key: string) => this.keys?.[key] ? Phaser.Input.Keyboard.JustDown(this.keys[key]) : false;
    let moveX = Number(down('right') || down('d')) - Number(down('left') || down('a'));
    let moveY = Number(down('down') || down('s')) - Number(down('up') || down('w'));
    if (this.touchVector.lengthSq() > .01) { moveX = this.touchVector.x; moveY = this.touchVector.y; }
    const length = Math.hypot(moveX,moveY); if (length > 1) { moveX/=length; moveY/=length; }
    return {
      moveX, moveY, jump: just('jump') || this.queued.jump, dig: just('dig') || this.queued.dig,
      bark: just('bark') || this.queued.bark, pause: just('pause') || this.queued.pause, confirm: just('confirm')
    };
  }

  private movePlayer(moveX: number, moveY: number, time: number, delta: number): void {
    if (!moveX && !moveY || this.onStone()) return;
    this.lastMove.set(moveX,moveY).normalize();
    let dx = moveX + moveY; let dy = moveY - moveX;
    const length = Math.hypot(dx,dy); dx/=length; dy/=length;
    const multiplier = this.run.isPowerActive('zoomie', time) ? ZOOMIE_SPEED_MULTIPLIER : 1;
    const amount = DOG.baseSpeed * multiplier * delta / 1000;
    const nx = this.player.x + dx * amount; const ny = this.player.y + dy * amount;
    if (this.canOccupy(nx, this.player.y)) this.player.x = nx;
    if (this.canOccupy(this.player.x, ny)) this.player.y = ny;
  }

  private canOccupy(x: number, y: number): boolean {
    return isFloorCell(Math.round(x), Math.round(y));
  }

  private onStone(): boolean {
    return JUMP_PATHS.flat().some(point => isLavaCell(point.x,point.y) && Phaser.Math.Distance.Between(this.player.x,this.player.y,point.x,point.y) < .35);
  }

  private nearbyJumpNode(): { path: GridPoint[]; index: number } | undefined {
    for (const path of JUMP_PATHS) for (let index=0;index<path.length;index++) {
      if (Phaser.Math.Distance.Between(this.player.x,this.player.y,path[index].x,path[index].y)<.7) return {path,index};
    }
    return undefined;
  }

  private tryJump(moveX: number, moveY: number): void {
    if (this.busy) return;
    const node = this.nearbyJumpNode();
    if (!node) { this.jumpForward(moveX, moveY); return; }
    const candidates = [node.index-1,node.index+1].filter(index=>index>=0&&index<node.path.length);
    let desired = new Phaser.Math.Vector2(moveX,moveY);
    if (desired.lengthSq()<.02) desired=this.lastMove.clone();
    let targetIndex = candidates[0]; let best=-Infinity;
    const currentWorld=gridToWorld(node.path[node.index]);
    candidates.forEach(index=>{
      const world=gridToWorld(node.path[index]); const direction=new Phaser.Math.Vector2(world.x-currentWorld.x,world.y-currentWorld.y).normalize();
      const dot=direction.dot(desired); if(dot>best){best=dot;targetIndex=index;}
    });
    const target=node.path[targetIndex]; this.busy=true; this.audio.jump();
    this.dogSprite.play('pip-jump', true);
    this.tweens.add({targets:this.player,x:target.x,y:target.y,duration:430,ease:'Sine.inOut',onComplete:()=>{this.player.x=target.x;this.player.y=target.y;this.busy=false;}});
    this.tweens.add({targets:this.player,jumpLift:-48,duration:215,yoyo:true,ease:'Sine.out'});
  }

  private jumpForward(moveX: number, moveY: number): void {
    if(this.busy)return;
    let screenDirection = new Phaser.Math.Vector2(moveX, moveY);
    if (screenDirection.lengthSq() < .02) screenDirection = this.lastMove.clone();
    screenDirection.normalize();
    const logicalDirection = new Phaser.Math.Vector2(
      screenDirection.x + screenDirection.y,
      screenDirection.y - screenDirection.x
    ).normalize();
    const target = {
      x: this.player.x + logicalDirection.x * 1.1,
      y: this.player.y + logicalDirection.y * 1.1
    };
    const clearLanding = [0.25, 0.5, 0.75, 1].every(progress => this.canOccupy(
      Phaser.Math.Linear(this.player.x, target.x, progress),
      Phaser.Math.Linear(this.player.y, target.y, progress)
    ));

    this.busy=true; this.audio.jump();
    this.dogSprite.play('pip-jump', true);
    if (clearLanding) {
      this.tweens.add({targets:this.player,x:target.x,y:target.y,duration:430,ease:'Sine.inOut',onComplete:()=>{
        this.player.x=target.x;this.player.y=target.y;this.busy=false;
      }});
      this.tweens.add({targets:this.player,jumpLift:-38,duration:215,yoyo:true,ease:'Sine.out'});
      return;
    }
    this.tweens.add({targets:this.player,jumpLift:-23,duration:150,yoyo:true,ease:'Sine.out',onComplete:()=>this.busy=false});
  }

  private tryDig(): void {
    if(this.busy)return;
    const view=this.nearDigSpot(); if(!view){
      this.dogSprite.setAngle(-4); this.time.delayedCall(180,()=>this.dogSprite.setAngle(0)); return;
    }
    this.busy=true; this.audio.dig();
    this.dogSprite.play('pip-dig', true);
    this.time.delayedCall(850,()=>{
      if(view.spot.dug){this.busy=false;return;}
      view.spot.dug=true; view.object.setVisible(false); this.run.collectTreasure(view.spot.treasure);
      this.lastDiscovery=this.time.now; this.audio.treasure(view.spot.treasure.kind==='pirate');
      this.showTreasure(view.spot); this.busy=false; this.updateScore();
    });
  }

  private showTreasure(spot: ActiveDigSpot): void {
    const world=gridToWorld(spot);
    const card=this.add.container(world.x,world.y-90).setDepth(9000);
    const bg=this.add.rectangle(0,0,260,86,spot.treasure.kind==='pirate'?0x705023:0x342019,.95).setStrokeStyle(4,spot.treasure.kind==='pirate'?0xffdc61:0x82dfc4);
    const reward = spot.treasure.kind === 'pirate'
      ? this.add.image(-91, 0, 'burrow-atlas-v2', 'env-14').setDisplaySize(72,72)
      : this.add.image(-91, 0, 'household-treasures-v2', `treasure-${TREASURE_SPRITE_FRAMES[spot.treasure.id]}`).setDisplaySize(66,80);
    const text=this.add.text(28,0,`${spot.treasure.name}\n+${spot.treasure.points}`,{fontFamily:'Fredoka, sans-serif',fontSize:'20px',color:'#fff1ca',align:'center',fontStyle:'bold'}).setOrigin(.5);
    card.add([bg,reward,text]); card.setScale(.6); card.setAlpha(0);
    this.tweens.add({targets:card,scale:1,alpha:1,y:world.y-130,duration:380,ease:'Back.out',hold:1500,yoyo:true,onComplete:()=>card.destroy()});
    if(spot.treasure.kind==='pirate') this.cameras.main.flash(500,255,205,76,false);
  }

  private nearDigSpot(): DigView | undefined {
    return this.digViews.find(view=>!view.spot.dug&&Phaser.Math.Distance.Between(this.player.x,this.player.y,view.spot.x,view.spot.y)<1.05);
  }

  private bark(): void {
    if(this.barkBubble.alpha>0)return;
    this.audio.bark(); this.barkBubble.setText(Math.random()>.5?'WOOF!':'ARF!');
    this.dogSprite.play('pip-bark', true);
    this.barkBubble.setAlpha(1).setScale(.6);
    this.tweens.add({targets:this.barkBubble,alpha:0,scale:1.15,y:'-=18',duration:700,ease:'Sine.out',onComplete:()=>this.barkBubble.y=-105});
  }

  private collectNearby(time:number):void{
    this.collectibleViews.forEach(view=>{
      if(view.collected)return;
      const p=view.definition.position;
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<.62){
        view.collected=true; view.object.setVisible(false); this.lastDiscovery=time;
        if(view.definition.kind==='food')this.run.collectFood();
        else {const power=view.definition.power!;this.run.collectTreat(power,time);this.audio.power(power);this.showPowerLabel(power);}
        this.audio.pickup();this.updateScore();
      }
    });
  }

  private showPowerLabel(kind:PowerKind):void{
    const label=this.add.text(640,145,POWERS[kind].label,{fontFamily:'Fredoka, sans-serif',fontSize:'40px',color:`#${POWERS[kind].color.toString(16).padStart(6,'0')}`,fontStyle:'bold',stroke:'#301a13',strokeThickness:7}).setOrigin(.5).setScrollFactor(0).setDepth(12000).setScale(.6);
    this.tweens.add({targets:label,scale:1,alpha:{from:1,to:0},y:115,duration:1300,ease:'Back.out',onComplete:()=>label.destroy()});
  }

  private updateDiscovery(time:number):void{
    const key=`${Math.round(this.player.x)},${Math.round(this.player.y)}`;
    if(!this.visited.has(key)){this.visited.add(key);this.lastDiscovery=time;}
    if(time-this.lastDiscovery>20_000&&this.hint.alpha===0){this.showHint();this.lastDiscovery=time;}
  }

  private showHint():void{
    const dogWorld=gridToWorld(this.player);const exitWorld=gridToWorld(BURROW.exit);
    this.hint.setPosition(dogWorld.x,dogWorld.y-115);
    const direction=new Phaser.Math.Vector2(exitWorld.x-dogWorld.x,exitWorld.y-dogWorld.y);
    const text=this.hint.getAt(1) as Phaser.GameObjects.Text;
    text.setText(`🐾  This way!  ${Math.abs(direction.x)>Math.abs(direction.y)?(direction.x>0?'➜':'⬅'):(direction.y>0?'⬇':'⬆')}`);
    this.tweens.add({targets:this.hint,alpha:{from:0,to:1},duration:300,hold:4200,yoyo:true});
  }

  private updateVisibility=():void=>{
    if(!this.profile)return;
    const now=this.time.now;const radius=this.run.isPowerActive('glow',now)?7.5:5;
    this.tileViews.forEach(tile=>{
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,tile.point.x,tile.point.y);
      if(distance<radius*.65)tile.discovered=true;
      tile.object.setAlpha(this.profile.fullBrightness ? 1 : distance < radius ? Phaser.Math.Linear(.95, .28, distance / radius) : tile.discovered ? .24 : .035);
    });
    const sniff=this.run.isPowerActive('sniff',now);
    this.collectibleViews.forEach(view=>{
      if(view.collected)return;
      const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,view.definition.position.x,view.definition.position.y);
      view.object.setAlpha(this.profile.fullBrightness || d < radius ? 1 : sniff && d < 10 ? .9 : .05);
    });
    this.digViews.forEach(view=>{
      if(view.spot.dug)return;
      const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,view.spot.x,view.spot.y);
      view.object.setAlpha(this.profile.fullBrightness || d < radius ? 1 : sniff && d < 10 ? .95 : .04);
    });
  };

  private updateHud(time:number):void{
    (Object.keys(POWERS)as PowerKind[]).forEach(kind=>{
      const view=this.powerHud.get(kind)!;const remaining=this.run.remainingPower(kind,time);
      view.setAlpha(remaining>0?1:.25);(view.getAt(2)as Phaser.GameObjects.Text).setText(remaining>0?`${Math.ceil(remaining/1000)}s`:'—');
    });
    const nearJump=!!this.nearbyJumpNode();const nearDig=!!this.nearDigSpot();
    this.jumpPrompt.setAlpha(nearJump?1:0);this.digPrompt.setAlpha(nearDig?1:0);
    if(nearJump&&nearDig){this.jumpPrompt.x=550;this.digPrompt.x=730;}else{this.jumpPrompt.x=640;this.digPrompt.x=640;}
  }

  private updateScore():void{this.scoreText.setText(`🍖  ${this.run.score.toLocaleString()}`);this.tweens.add({targets:this.scoreText,scale:1.18,duration:100,yoyo:true});}

  private positionDog(time:number,moving:boolean):void{
    const world=gridToWorld(this.player);this.dog.setPosition(world.x,world.y+this.player.jumpLift);
    if (!this.busy) {
      const desiredAnimation = moving ? 'pip-run' : 'pip-idle';
      if (this.dogSprite.anims.currentAnim?.key !== desiredAnimation) this.dogSprite.play(desiredAnimation, true);
    }
    this.dogSprite.y = -30 + (moving && !this.busy ? Math.sin(time * .018) * 2 : 0);
    if(this.lastMove.x<-.08)this.dogSprite.setFlipX(true);else if(this.lastMove.x>.08)this.dogSprite.setFlipX(false);
  }

  private checkExit():void{
    if(this.finished||Phaser.Math.Distance.Between(this.player.x,this.player.y,BURROW.exit.x,BURROW.exit.y)>1.05)return;
    this.finished=true;const pirateFound=this.run.treasures.some(t=>t.kind==='pirate');
    const isBest=this.run.score>this.profile.bestScore;this.profile=addDiscoveries(this.profile,this.run.treasures.filter(t=>t.kind==='ordinary').map(t=>t.id),pirateFound);
    if(isBest)this.profile.bestScore=this.run.score;saveProfile(this.profile);this.registry.set('profile',this.profile);
    const result:RunResults={score:this.run.score,foodFound:this.run.foodFound,treatsFound:this.run.treatsFound,treasures:[...this.run.treasures],pirateFound,isBest};
    this.registry.set('lastRun',result);this.audio.win();this.cameras.main.fadeOut(850,42,24,18);
    this.time.delayedCall(900,()=>this.scene.start('OwnerReturn'));
  }
}

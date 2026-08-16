import Phaser from 'phaser';
import {
  BURROW, DOG, FARM_TREASURE_SPRITE_FRAMES, POWERS, TREASURE_SPRITE_FRAMES,
  ZOOMIE_SPEED_MULTIPLIER, getAnimal, getLevelForAnimal
} from '../data/content';
import { UNDERGROUND_WORLD, getWorld, type WorldDefinition } from '../data/worlds';
import type { ActiveDigSpot, AnimalDefinition, CollectibleDefinition, GridPoint, LevelDefinition, PlayerActions, PowerKind, RunResults } from '../types';
import { addDiscoveries, animalBestScore, saveProfile, type PlayerProfile } from '../systems/profile';
import { RunState } from '../systems/runState';
import { activateThemedDigSpots } from '../systems/treasure';
import type { Soundscape } from '../systems/audio';
import { shouldShowTouchControls } from '../systems/device';
import { canCollectAlongPath } from '../systems/collectibles';
import { getGameLayout, type GameLayout } from '../systems/layout';
import { nearestUndugTreasure, TREASURE_REVEAL_MS } from '../systems/guidance';
import { UiDepth, WorldLayer, projectGridPoint, worldDepth } from '../systems/rendering';
import { EnvironmentRenderer, type EnvironmentView } from '../rendering/EnvironmentRenderer';

interface PlayerModel extends GridPoint { jumpLift: number }
interface CollectibleView { definition: CollectibleDefinition; object: Phaser.GameObjects.Container; collected: boolean }
interface DigView { spot: ActiveDigSpot; object: Phaser.GameObjects.Container }
interface UiAnchor { object: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform; x: number; y: number }
interface TouchTarget { circle: Phaser.GameObjects.Arc; x: number; y: number; radius: number }

export class MazeScene extends Phaser.Scene {
  private player: PlayerModel = { ...BURROW.start, jumpLift: 0 };
  private animal: AnimalDefinition = DOG;
  private level: LevelDefinition = BURROW;
  private world: WorldDefinition = UNDERGROUND_WORLD;
  private dog!: Phaser.GameObjects.Container;
  private dogSprite!: Phaser.GameObjects.Sprite;
  private barkBubble!: Phaser.GameObjects.Text;
  private run = new RunState();
  private profile!: PlayerProfile;
  private audio!: Soundscape;
  private tileViews: EnvironmentView[] = [];
  private collectibleViews: CollectibleView[] = [];
  private digViews: DigView[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private digPrompt!: Phaser.GameObjects.Container;
  private jumpPrompt!: Phaser.GameObjects.Container;
  private powerHud = new Map<PowerKind, Phaser.GameObjects.Container>();
  private hint!: Phaser.GameObjects.Container;
  private treasureHint!: Phaser.GameObjects.Container;
  private treasureHintArrow!: Phaser.GameObjects.Text;
  private barkTreasureTarget?: DigView;
  private barkTreasureUntil = 0;
  private exitReminderUntil = 0;
  private lastDiscovery = 0;
  private bestExitDistance = Infinity;
  private visited = new Set<string>();
  private lastMove = new Phaser.Math.Vector2(1, 0);
  private busy = false;
  private finished = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private touchVector = new Phaser.Math.Vector2();
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickPointer?: number;
  private followPointer?: Phaser.Input.Pointer;
  private followMarker?: Phaser.GameObjects.Arc;
  private queued = { jump: false, dig: false, bark: false, pause: false };
  private touchUi: Array<Phaser.GameObjects.Arc | Phaser.GameObjects.Text> = [];
  private joystickUi: Array<Phaser.GameObjects.Arc> = [];
  private touchTargets: TouchTarget[] = [];
  private actionButtons = new Map<'jump' | 'dig' | 'bark' | 'pause', Phaser.GameObjects.Arc>();
  private uiAnchors: UiAnchor[] = [];
  private layout!: GameLayout;
  private pickupFrom: GridPoint = { ...BURROW.start };

  constructor() { super('Maze'); }

  create(): void {
    this.profile = this.registry.get('profile') as PlayerProfile;
    this.animal = getAnimal(this.profile.selectedAnimalId);
    this.level = getLevelForAnimal(this.animal.id, this.profile.selectedMapId);
    this.world = getWorld(this.level.mapId);
    this.audio = this.registry.get('soundscape') as Soundscape;
    this.player = { ...this.level.start, jumpLift: 0 };
    this.run = new RunState();
    this.tileViews = []; this.collectibleViews = []; this.digViews = [];
    this.visited.clear(); this.busy = false; this.finished = false;
    this.touchUi = []; this.joystickUi = []; this.touchTargets = []; this.actionButtons.clear(); this.uiAnchors = [];
    this.touchVector.set(0); this.joystickPointer = undefined; this.followPointer = undefined;
    this.pickupFrom = { x:this.player.x, y:this.player.y };
    this.lastDiscovery = this.time.now;
    this.bestExitDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.level.exit.x, this.level.exit.y);
    this.barkTreasureTarget = undefined; this.barkTreasureUntil = 0;
    this.layout = getGameLayout(this);
    this.cameras.main.setBackgroundColor(this.world.theme === 'farm' ? '#314b2b' : '#170e0b');
    this.cameras.main.setBounds(0, 0, 3500, 1650);
    const environment = new EnvironmentRenderer(this, this.world);
    this.tileViews = environment.render();
    this.createCollectibles();
    this.createDigSpots();
    environment.renderHome(this.level, this.animal);
    this.createDog();
    this.createHud();
    this.createKeyboard();
    this.createTouchControls();
    this.layoutUi();
    this.cameras.main.startFollow(this.dog, true, .075, .075);
    this.cameras.main.setZoom(1.06);

    this.game.events.on('brightness-changed', this.updateVisibility, this);
    this.game.events.on('touch-controls-changed', this.syncTouchControls, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.on(Phaser.Scenes.Events.PAUSE, this.stopTouchMovement, this);
    window.addEventListener('blur', this.stopTouchMovement);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('brightness-changed', this.updateVisibility, this);
      this.game.events.off('touch-controls-changed', this.syncTouchControls, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.stopTouchMovement, this);
      window.removeEventListener('blur', this.stopTouchMovement);
      this.input.off('pointerdown', this.beginFollowTouch, this);
      this.input.off('pointermove', this.moveTouchPointer, this);
      this.input.off('pointerup', this.endTouchPointer, this);
      this.input.off('pointerupoutside', this.endTouchPointer, this);
      this.input.off('gameout', this.stopTouchMovement, this);
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
    this.updateTreasureHint(time);
    this.collectNearby(time, this.pickupFrom);
    this.pickupFrom = { x: this.player.x, y: this.player.y };
    this.updateDiscovery(time);
    this.updateVisibility();
    this.updateHud(time);
    this.checkExit();
    this.queued = { jump: false, dig: false, bark: false, pause: false };
  }

  private createCollectibles(): void {
    this.world.collectibles.forEach((definition, index) => {
      const world = projectGridPoint(definition.position);
      const shadow = this.add.ellipse(0, 13, 38, 14, 0x1b100c, .5);
      const rabbitFrame = definition.kind === 'food' ? 1 + index % 4 : definition.power === 'zoomie' ? 5 : definition.power === 'glow' ? 6 : 7;
      const dogFrame = definition.kind === 'food' ? 8 : definition.power === 'zoomie' ? 9 : definition.power === 'glow' ? 10 : 11;
      const texture = this.world.theme === 'farm' ? 'farm-atlas' : this.animal.id === 'cream-bunny' ? 'rabbit-atlas' : 'burrow-atlas';
      const farmFrame = definition.kind === 'food' ? (this.animal.id === 'cream-bunny' ? 9 : 8) : definition.power === 'zoomie' ? 10 : definition.power === 'glow' ? 11 : 12;
      const frame = this.world.theme === 'farm' ? `farm-${farmFrame}` : this.animal.id === 'cream-bunny' ? `rabbit-${rabbitFrame}` : `env-${dogFrame}`;
      const icon = this.add.image(0, -5, texture, frame).setDisplaySize(definition.kind === 'food' ? 48 : 57, definition.kind === 'food' ? 48 : 57);
      const container = this.add.container(world.x, world.y - 22, [shadow, icon]).setDepth(worldDepth(world.y, WorldLayer.interactive));
      this.tweens.add({ targets: icon, y: '-=8', angle: {from:-3,to:3}, duration: 700 + definition.position.x * 13, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.collectibleViews.push({ definition, object: container, collected: false });
    });
  }

  private createDigSpots(): void {
    const active = activateThemedDigSpots(
      this.world.ordinaryDigSpots, this.profile.collection, this.world.treasureCatalog,
      this.world.specialDigSpots, this.world.specialTreasure
    );
    active.forEach(spot => {
      const world = projectGridPoint(spot);
      const mound = this.add.image(0, -7, this.world.theme === 'farm' ? 'farm-atlas' : 'burrow-atlas', this.world.theme === 'farm' ? 'farm-6' : 'env-12').setDisplaySize(74,74);
      const glint = this.add.text(0, -32, '✦', { fontSize: '20px', color: '#ffd978', stroke:'#5e351c', strokeThickness:3 }).setOrigin(.5).setAlpha(.6);
      const object = this.add.container(world.x, world.y + 1, [mound, glint]).setDepth(worldDepth(world.y, WorldLayer.interactive));
      this.tweens.add({ targets: glint, alpha: {from:.25,to:.9}, scale: {from:.8,to:1.2}, duration: 900, yoyo: true, repeat: -1 });
      this.digViews.push({ spot, object });
    });
  }

  private createDog(): void {
    const shadow = this.add.ellipse(0, 18, 78, 25, 0x100907, .52);
    const spriteSize = 128 * (this.animal.gameScale ?? 1);
    this.dogSprite = this.add.sprite(0, -30 + (this.animal.groundOffsetY ?? 0), this.animal.spriteTexture, `${this.animal.spriteKey}-14`).setDisplaySize(spriteSize,spriteSize);
    this.dogSprite.play(`${this.animal.spriteKey}-idle`);
    const startWorld=projectGridPoint(this.player);
    this.dog = this.add.container(0, 0, [shadow, this.dogSprite]).setDepth(worldDepth(startWorld.y, WorldLayer.actor));
    this.barkBubble = this.add.text(0, -105, 'WOOF!', {
      fontFamily:'Fredoka, sans-serif',fontSize:'25px',color:'#fff3c9',fontStyle:'bold',stroke:'#4a281d',strokeThickness:5
    }).setOrigin(.5).setAlpha(0);
    this.dog.add(this.barkBubble);
    this.positionDog(0, false);
  }

  private createHud(): void {
    const hudBg = this.add.rectangle(170, 54, 300, 78, 0x2b1913, .9).setStrokeStyle(3, 0xf2c47a, .55).setScrollFactor(0).setDepth(UiDepth.hud);
    this.scoreText = this.add.text(58, 53, `${this.animal.foodIcon}  0`, { fontFamily:'Fredoka, sans-serif',fontSize:'29px',color:'#fff1ca',fontStyle:'bold' }).setOrigin(0,.5).setScrollFactor(0).setDepth(UiDepth.hudContent);
    const best = this.add.text(274, 55, `BEST\n${animalBestScore(this.profile,this.animal.id)}`, {fontFamily:'Fredoka, sans-serif',fontSize:'15px',align:'center',color:'#82dfc4'}).setOrigin(.5).setScrollFactor(0).setDepth(UiDepth.hudContent);
    this.anchorUi(hudBg, 170, 54); this.anchorUi(this.scoreText, 58, 53); this.anchorUi(best, 274, 55);
    const objectiveBg = this.add.rectangle(1040, 112, 260, 78, 0x2b1913, .94).setStrokeStyle(4, 0x82dfc4, .75).setScrollFactor(0).setDepth(UiDepth.hud);
    this.objectiveText = this.add.text(1040, 111, this.objectiveCopy(), {
      fontFamily:'Fredoka, sans-serif',fontSize:'16px',align:'center',color:'#fff1ca',fontStyle:'bold',lineSpacing:4
    }).setOrigin(.5).setScrollFactor(0).setDepth(UiDepth.hudContent);
    this.anchorUi(objectiveBg, 1040, 112); this.anchorUi(this.objectiveText, 1040, 111);
    (Object.keys(POWERS) as PowerKind[]).forEach((kind, index) => {
      const x = 500 + index * 145;
      const bg = this.add.rectangle(0, 0, 128, 55, 0x2b1913, .82).setStrokeStyle(2, POWERS[kind].color, .5);
      const icon = this.add.text(-43, 0, kind === 'zoomie' ? '⚡' : kind === 'glow' ? '☀' : '👃', {fontSize:'26px'}).setOrigin(.5);
      const text = this.add.text(10, 0, '', {fontFamily:'Fredoka, sans-serif',fontSize:'17px',color:'#fff1ca',fontStyle:'bold'}).setOrigin(.5);
      const container = this.add.container(x, 50, [bg,icon,text]).setScrollFactor(0).setDepth(UiDepth.hudContent).setAlpha(.3);
      this.powerHud.set(kind, container);
      this.anchorUi(container, x, 50);
    });
    this.hint = this.add.container(0, 0).setDepth(worldDepth(0, WorldLayer.effect)).setAlpha(0);
    const hintBg = this.add.rectangle(0, 0, 285, 66, 0x24140f, .97).setStrokeStyle(5, 0x82dfc4, .95);
    const hintText = this.add.text(0, 0, '🏠  HOME IS THIS WAY  ➜', {fontFamily:'Fredoka, sans-serif',fontSize:'21px',color:'#c8ffeb',fontStyle:'bold'}).setOrigin(.5);
    this.hint.add([hintBg,hintText]);
    const treasureBg = this.add.rectangle(0, 0, 260, 64, 0x3b2512, .98).setStrokeStyle(5, 0xffd55f, .95);
    const treasureLabel = this.add.text(-32, 0, 'TREASURE!', {fontFamily:'Fredoka, sans-serif',fontSize:'22px',color:'#fff2a8',fontStyle:'bold'}).setOrigin(.5);
    this.treasureHintArrow = this.add.text(92, 0, '➤', {fontFamily:'Arial, sans-serif',fontSize:'38px',color:'#ffcf45',fontStyle:'bold'}).setOrigin(.5);
    this.treasureHint = this.add.container(0, 0, [treasureBg, treasureLabel, this.treasureHintArrow]).setDepth(worldDepth(0, WorldLayer.effect)).setAlpha(0);
    const exploreBg = this.add.rectangle(0, 0, 610, 54, 0x24140f, .95).setStrokeStyle(4, 0xf2c47a, .85);
    const openingTip = this.world.theme === 'farm'
      ? `${this.animal.foodIcon}  FIND ${this.requiredFood()} FARM FOODS  •  ${this.animal.actionLabel} TO REVEAL TREASURE`
      : `🐾  EXPLORE EVERY TUNNEL  •  ${this.animal.actionLabel} TO REVEAL TREASURE`;
    const exploreText = this.add.text(0, 0, openingTip, {
      fontFamily:'Fredoka, sans-serif',fontSize:'19px',color:'#fff1ca',fontStyle:'bold'
    }).setOrigin(.5);
    const exploreTip = this.add.container(640, 178, [exploreBg, exploreText]).setScrollFactor(0).setDepth(UiDepth.prompt);
    this.anchorUi(exploreTip, 640, 178);
    this.tweens.add({targets:exploreTip,alpha:0,y:'-=16',delay:5200,duration:700,onComplete:()=>exploreTip.destroy()});
    this.jumpPrompt = this.makePrompt('SPACE', 'JUMP', 0xf07954);
    this.digPrompt = this.makePrompt('E', 'DIG', 0x5a9b75);
  }

  private makePrompt(key: string, label: string, color: number): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 250, 62, 0x24140f, .98).setStrokeStyle(5, color, 1);
    const text = this.add.text(0, 0, `${key} — ${label}`, {fontFamily:'Fredoka, sans-serif',fontSize:'22px',color:'#fff6d8',fontStyle:'bold'}).setOrigin(.5);
    const prompt = this.add.container(640, 640, [bg,text]).setScrollFactor(0).setDepth(UiDepth.prompt).setAlpha(0);
    this.anchorUi(prompt, 640, 640);
    return prompt;
  }

  private anchorUi<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform>(object: T, x: number, y: number): T {
    this.uiAnchors.push({ object, x, y });
    return object;
  }

  private layoutUi(): void {
    this.layout = getGameLayout(this);
    this.uiAnchors.forEach(anchor => anchor.object.setPosition(this.layout.safeX + anchor.x, this.layout.safeY + anchor.y));
    this.resetJoystick();
    this.stopTouchMovement();
  }

  private handleResize = (): void => this.layoutUi();

  private createKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = keyboard.addKeys({
      up:'UP',down:'DOWN',left:'LEFT',right:'RIGHT',w:'W',a:'A',s:'S',d:'D',
      jump:'SPACE',dig:'E',bark:'B',pause:'ESC',confirm:'ENTER'
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private createTouchControls(): void {
    this.buildTouchControls();
    this.syncTouchControls();
  }

  private syncTouchControls = (): void => {
    const shouldShow = shouldShowTouchControls(this.profile.touchControls);
    if (shouldShow && this.touchUi.length === 0) this.buildTouchControls();
    const joystickVisible = shouldShow && this.profile.touchMovement === 'joystick';
    this.touchUi.forEach(object => {
      object.setVisible(shouldShow);
      const interactive = object as Phaser.GameObjects.GameObject & { input?: { enabled: boolean } };
      if (interactive.input) interactive.input.enabled = shouldShow;
    });
    this.joystickUi.forEach(object => {
      object.setVisible(joystickVisible);
      if (object.input) object.input.enabled = joystickVisible;
    });
    this.followMarker?.setVisible(false);
    this.stopTouchMovement();
  };

  private buildTouchControls(): void {
    const base = this.add.circle(135, 575, 82, 0x2b1913, .65).setStrokeStyle(5, 0xffe2aa, .5).setScrollFactor(0).setDepth(UiDepth.touchControl)
      .setInteractive({ useHandCursor: true });
    const knob = this.add.circle(135, 575, 36, 0xffe1aa, .72).setScrollFactor(0).setDepth(UiDepth.touchContent);
    this.joystickKnob = knob; this.touchUi.push(base, knob); this.joystickUi.push(base, knob);
    this.anchorUi(base, 135, 575); this.anchorUi(knob, 135, 575);
    const updateStick = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointer) return;
      const centerX = this.layout.safeX + 135; const centerY = this.layout.safeY + 575;
      const vector = new Phaser.Math.Vector2(pointer.x - centerX, pointer.y - centerY);
      if (vector.length() > 70) vector.setLength(70);
      this.touchVector.copy(vector).scale(1 / 70);
      knob.setPosition(centerX + vector.x, centerY + vector.y);
    };
    base.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.joystickPointer = pointer.id; updateStick(pointer); });
    this.input.on('pointerdown', this.beginFollowTouch, this);
    this.input.on('pointermove', updateStick);
    this.input.on('pointermove', this.moveTouchPointer, this);
    this.input.on('pointerup', this.endTouchPointer, this);
    this.input.on('pointerupoutside', this.endTouchPointer, this);
    this.input.on('gameout', this.stopTouchMovement, this);
    this.followMarker = this.add.circle(0, 0, 26, 0xffe2aa, .2).setStrokeStyle(4, 0xffe2aa, .65).setScrollFactor(0).setDepth(UiDepth.touchMarker).setVisible(false);
    this.touchUi.push(this.followMarker);
    this.touchAction('jump', 1120, 570, 68, '🐾', 'JUMP', () => this.queued.jump = true, 0xd96545);
    this.touchAction('dig', 970, 625, 52, '🦴', 'DIG', () => this.queued.dig = true, 0x4f9275);
    this.touchAction('bark', 1220, 655, 46, this.animal.actionIcon, this.animal.actionLabel, () => this.queued.bark = true, 0x6e518d);
    this.touchAction('pause', 1228, 108, 34, 'Ⅱ', '', () => this.queued.pause = true, 0x604338);
  }

  private touchAction(kind:'jump'|'dig'|'bark'|'pause',x:number,y:number,radius:number,icon:string,label:string,action:()=>void,color:number): void {
    const circle = this.add.circle(x,y,radius,color,.82).setStrokeStyle(4,0xffedc5,.65).setScrollFactor(0).setDepth(UiDepth.touchControl).setInteractive({useHandCursor:true});
    const iconText = this.add.text(x,y - (label ? 8 : 0),icon,{fontSize:`${Math.round(radius*.72)}px`,fontFamily:'Fredoka, sans-serif',fontStyle:'bold'}).setOrigin(.5).setScrollFactor(0).setDepth(UiDepth.touchContent);
    const labelText = this.add.text(x,y+radius*.48,label,{fontSize:'13px',fontFamily:'Fredoka, sans-serif',fontStyle:'bold',color:'#fff1ca'}).setOrigin(.5).setScrollFactor(0).setDepth(UiDepth.touchContent);
    circle.on('pointerdown',()=>{circle.setScale(.92);action();});
    circle.on('pointerup',()=>circle.setScale(1)); circle.on('pointerout',()=>circle.setScale(1));
    this.touchUi.push(circle,iconText,labelText);
    this.touchTargets.push({ circle, x, y, radius }); this.actionButtons.set(kind, circle);
    this.anchorUi(circle, x, y); this.anchorUi(iconText, x, y - (label ? 8 : 0)); this.anchorUi(labelText, x, y + radius * .48);
  }

  private pointerHitsAction(pointer: Phaser.Input.Pointer): boolean {
    return this.touchTargets.some(target => Math.hypot(
      pointer.x - (this.layout.safeX + target.x), pointer.y - (this.layout.safeY + target.y)
    ) <= target.radius + 12);
  }

  private beginFollowTouch(pointer: Phaser.Input.Pointer): void {
    if (!shouldShowTouchControls(this.profile.touchControls) || this.profile.touchMovement !== 'follow' || this.followPointer || this.pointerHitsAction(pointer)) return;
    this.followPointer = pointer;
    this.followMarker?.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  private moveTouchPointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.followPointer?.id) return;
    this.followMarker?.setPosition(pointer.x, pointer.y);
  }

  private endTouchPointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointer) this.resetJoystick();
    if (pointer.id === this.followPointer?.id) this.stopFollowTouch();
  }

  private resetJoystick(): void {
    this.joystickPointer = undefined; this.touchVector.set(0);
    this.joystickKnob?.setPosition(this.layout.safeX + 135, this.layout.safeY + 575);
  }

  private stopFollowTouch(): void { this.followPointer = undefined; this.followMarker?.setVisible(false); }
  private stopTouchMovement = (): void => { this.resetJoystick(); this.stopFollowTouch(); };

  private readActions(): PlayerActions {
    const down = (key: string) => this.keys?.[key]?.isDown ?? false;
    const just = (key: string) => this.keys?.[key] ? Phaser.Input.Keyboard.JustDown(this.keys[key]) : false;
    let moveX = Number(down('right') || down('d')) - Number(down('left') || down('a'));
    let moveY = Number(down('down') || down('s')) - Number(down('up') || down('w'));
    if (this.profile.touchMovement === 'follow' && this.followPointer) {
      const target = this.cameras.main.getWorldPoint(this.followPointer.x, this.followPointer.y);
      const vector = new Phaser.Math.Vector2(target.x - this.dog.x, target.y - this.dog.y);
      if (vector.length() > 42 / this.cameras.main.zoom) { moveX = vector.x; moveY = vector.y; } else { moveX = 0; moveY = 0; }
    } else if (this.touchVector.lengthSq() > .01) { moveX = this.touchVector.x; moveY = this.touchVector.y; }
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
    const amount = this.animal.baseSpeed * multiplier * delta / 1000;
    const nx = this.player.x + dx * amount; const ny = this.player.y + dy * amount;
    if (this.canOccupy(nx, this.player.y)) this.player.x = nx;
    if (this.canOccupy(this.player.x, ny)) this.player.y = ny;
  }

  private canOccupy(x: number, y: number): boolean {
    return this.world.isFloorCell(Math.round(x), Math.round(y));
  }

  private onStone(): boolean {
    return this.world.jumpPaths.flat().some(point => this.world.isObstacleCell(point.x,point.y) && Phaser.Math.Distance.Between(this.player.x,this.player.y,point.x,point.y) < .35);
  }

  private nearbyJumpNode(): { path: GridPoint[]; index: number } | undefined {
    for (const path of this.world.jumpPaths) for (let index=0;index<path.length;index++) {
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
    const currentWorld=projectGridPoint(node.path[node.index]);
    candidates.forEach(index=>{
      const world=projectGridPoint(node.path[index]); const direction=new Phaser.Math.Vector2(world.x-currentWorld.x,world.y-currentWorld.y).normalize();
      const dot=direction.dot(desired); if(dot>best){best=dot;targetIndex=index;}
    });
    const target=node.path[targetIndex]; this.busy=true; this.audio.jump();
    this.dogSprite.play(`${this.animal.spriteKey}-jump`, true);
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
    this.dogSprite.play(`${this.animal.spriteKey}-jump`, true);
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
    const view=this.nearDigSpot();
    this.busy=true; this.audio.dig();
    this.dogSprite.play(`${this.animal.spriteKey}-dig`, true);
    this.time.delayedCall(850,()=>{
      if(!view || view.spot.dug){this.busy=false;return;}
      view.spot.dug=true; view.object.setVisible(false); this.run.collectTreasure(view.spot.treasure);
      this.lastDiscovery=this.time.now; this.audio.treasure(view.spot.treasure.kind==='pirate');
      this.showTreasure(view.spot); this.busy=false; this.updateScore();
    });
  }

  private showTreasure(spot: ActiveDigSpot): void {
    const world=projectGridPoint(spot);
    const card=this.add.container(world.x,world.y-90).setDepth(worldDepth(world.y, WorldLayer.effect));
    const bg=this.add.rectangle(0,0,260,86,spot.treasure.kind==='pirate'?0x705023:0x342019,.95).setStrokeStyle(4,spot.treasure.kind==='pirate'?0xffdc61:0x82dfc4);
    const reward = spot.treasure.kind === 'pirate'
      ? this.add.image(-91, 0, 'burrow-atlas', 'env-14').setDisplaySize(72,72)
      : this.add.image(-91, 0, this.world.theme === 'farm' ? 'farm-treasures' : 'household-treasures', this.world.theme === 'farm' ? `farm-treasure-${FARM_TREASURE_SPRITE_FRAMES[spot.treasure.id]}` : `treasure-${TREASURE_SPRITE_FRAMES[spot.treasure.id]}`).setDisplaySize(72,80);
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
    const treasure = nearestUndugTreasure(this.player, this.digViews.map(view => view.spot));
    const treasureView = treasure ? this.digViews.find(view => view.spot === treasure) : undefined;
    if (this.animal.id === 'cream-bunny') this.audio.honk(!!treasureView);
    else this.audio.bark(!!treasureView);
    const soundWord = this.animal.id === 'cream-bunny' ? 'HONK' : 'WOOF';
    this.barkBubble.setText(treasureView ? `${soundWord} ×3!` : `${soundWord}!`);
    this.dogSprite.play(`${this.animal.spriteKey}-action`, true);
    this.barkBubble.setAlpha(1).setScale(.6);
    this.tweens.add({targets:this.barkBubble,alpha:0,scale:1.15,y:'-=18',duration:700,ease:'Sine.out',onComplete:()=>this.barkBubble.y=-105});
    if (treasureView) this.revealTreasure(treasureView);
  }

  private revealTreasure(view: DigView): void {
    this.barkTreasureTarget = view; this.barkTreasureUntil = this.time.now + TREASURE_REVEAL_MS;
    this.tweens.killTweensOf(this.hint); this.tweens.killTweensOf(this.treasureHint); this.tweens.killTweensOf(view.object);
    this.hint.setAlpha(0); this.treasureHint.setAlpha(1).setScale(.72);
    this.tweens.add({targets:this.treasureHint,scale:1,duration:260,ease:'Back.out'});
    this.tweens.add({targets:view.object,scale:{from:1,to:1.18},duration:360,yoyo:true,repeat:3,ease:'Sine.inOut'});
  }

  private updateTreasureHint(time: number): void {
    const target = this.barkTreasureTarget;
    if (!target || target.spot.dug || time >= this.barkTreasureUntil) {
      this.barkTreasureTarget = undefined; this.treasureHint.setAlpha(0); return;
    }
    const dogWorld = projectGridPoint(this.player); const targetWorld = projectGridPoint(target.spot);
    this.treasureHint.setPosition(dogWorld.x, dogWorld.y - 155).setDepth(worldDepth(dogWorld.y, WorldLayer.effect)).setAlpha(1);
    this.treasureHintArrow.setRotation(Math.atan2(targetWorld.y - dogWorld.y, targetWorld.x - dogWorld.x));
  }

  private collectNearby(time:number, from:GridPoint):void{
    this.collectibleViews.forEach(view=>{
      if(view.collected)return;
      if(canCollectAlongPath(view.definition, from, this.player, this.world.isFloorCell)){
        view.collected=true; this.lastDiscovery=time;
        if(view.definition.kind==='food')this.run.collectFood();
        else {const power=view.definition.power!;this.run.collectTreat(power,time);this.audio.power(power);this.showPowerLabel(power);}
        this.audio.pickup();this.updateScore();
        const dogWorld = projectGridPoint(this.player);
        view.object.setDepth(worldDepth(dogWorld.y, WorldLayer.effect));
        this.tweens.add({
          targets:view.object,x:dogWorld.x,y:dogWorld.y-35,scale:.25,alpha:0,duration:230,ease:'Back.in',
          onComplete:()=>view.object.setVisible(false)
        });
      }
    });
  }

  private showPowerLabel(kind:PowerKind):void{
    const x=this.layout.safeX+640;const y=this.layout.safeY+145;
    const label=this.add.text(x,y,POWERS[kind].label,{fontFamily:'Fredoka, sans-serif',fontSize:'40px',color:`#${POWERS[kind].color.toString(16).padStart(6,'0')}`,fontStyle:'bold',stroke:'#301a13',strokeThickness:7}).setOrigin(.5).setScrollFactor(0).setDepth(UiDepth.announcement).setScale(.6);
    this.tweens.add({targets:label,scale:1,alpha:{from:1,to:0},y:y-30,duration:1300,ease:'Back.out',onComplete:()=>label.destroy()});
  }

  private updateDiscovery(time:number):void{
    const key=`${Math.round(this.player.x)},${Math.round(this.player.y)}`;
    if(!this.visited.has(key))this.visited.add(key);
    const exitDistance=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.level.exit.x,this.level.exit.y);
    if(exitDistance<this.bestExitDistance-.45){this.bestExitDistance=exitDistance;this.lastDiscovery=time;}
    if(time-this.lastDiscovery>14_000&&this.hint.alpha===0&&!this.barkTreasureTarget){this.showHint();this.lastDiscovery=time;}
  }

  private showHint():void{
    const dogWorld=projectGridPoint(this.player);const exitWorld=projectGridPoint(this.level.exit);
    this.hint.setPosition(dogWorld.x,dogWorld.y-115).setDepth(worldDepth(dogWorld.y, WorldLayer.effect));
    const direction=new Phaser.Math.Vector2(exitWorld.x-dogWorld.x,exitWorld.y-dogWorld.y);
    const text=this.hint.getAt(1) as Phaser.GameObjects.Text;
    text.setText(`🏠  HOME IS THIS WAY  ${Math.abs(direction.x)>Math.abs(direction.y)?(direction.x>0?'➜':'⬅'):(direction.y>0?'⬇':'⬆')}`);
    this.tweens.add({targets:this.hint,alpha:{from:0,to:1},scale:{from:.8,to:1},duration:260,hold:5200,yoyo:true,ease:'Back.out'});
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
      const barkRevealed=view===this.barkTreasureTarget&&now<this.barkTreasureUntil;
      view.object.setAlpha(barkRevealed||this.profile.fullBrightness || d < radius ? 1 : sniff && d < 10 ? .95 : .04);
    });
  };

  private updateHud(time:number):void{
    (Object.keys(POWERS)as PowerKind[]).forEach(kind=>{
      const view=this.powerHud.get(kind)!;const remaining=this.run.remainingPower(kind,time);
      view.setAlpha(remaining>0?1:.25);(view.getAt(2)as Phaser.GameObjects.Text).setText(remaining>0?`${Math.ceil(remaining/1000)}s`:'—');
    });
    const nearJump=!!this.nearbyJumpNode();const nearDig=!!this.nearDigSpot();
    const touchActive=shouldShowTouchControls(this.profile.touchControls);
    (this.jumpPrompt.getAt(1)as Phaser.GameObjects.Text).setText(touchActive?'TAP JUMP — CROSS!':'SPACE — JUMP');
    (this.digPrompt.getAt(1)as Phaser.GameObjects.Text).setText(touchActive?'TAP DIG — TREASURE!':'E — DIG');
    this.jumpPrompt.setAlpha(!touchActive&&nearJump?1:0);this.digPrompt.setAlpha(!touchActive&&nearDig?1:0);
    if(touchActive){this.jumpPrompt.setAlpha(nearJump?1:0);this.digPrompt.setAlpha(nearDig?1:0);}
    if(nearJump&&nearDig){this.jumpPrompt.x=this.layout.safeX+500;this.digPrompt.x=this.layout.safeX+780;}
    else{this.jumpPrompt.x=this.layout.safeX+640;this.digPrompt.x=this.layout.safeX+640;}
    const pulse=.04+Math.sin(time*.009)*.045;
    const jumpButton=this.actionButtons.get('jump');const digButton=this.actionButtons.get('dig');
    this.jumpPrompt.setScale(nearJump?1+pulse:1);this.digPrompt.setScale(nearDig?1+pulse:1);
    if(jumpButton){jumpButton.setAlpha(.96);jumpButton.setStrokeStyle(nearJump?8:4,nearJump?0xffff9b:0xffedc5,nearJump?1:.75);jumpButton.setScale(nearJump ? 1.08+pulse : 1);}
    if(digButton){digButton.setAlpha(.96);digButton.setStrokeStyle(nearDig?8:4,nearDig?0xffff9b:0xffedc5,nearDig?1:.75);digButton.setScale(nearDig ? 1.1+pulse : 1);}
  }

  private updateScore():void{
    this.scoreText.setText(`${this.animal.foodIcon}  ${this.run.score.toLocaleString()}`);
    this.objectiveText.setText(this.objectiveCopy());
    this.tweens.add({targets:this.scoreText,scale:1.18,duration:100,yoyo:true});
  }

  private requiredFood(): number {
    return this.level.goal.type === 'collectThenReachExit' ? this.level.goal.target : 0;
  }

  private objectiveCopy(): string {
    const required = this.requiredFood();
    if (required) {
      const ready = this.run.foodFound >= required;
      return ready
        ? `🚜  RETURN TO THE BARN!\n${this.animal.foodIcon} ${this.run.foodFound} / ${required}  •  READY!`
        : `${this.animal.foodIcon}  FIND FARM FOOD\n${this.run.foodFound} / ${required}  •  THEN FIND THE BARN`;
    }
    return `🏠  FIND HOME\n${this.animal.foodIcon} ${this.run.foodFound} / ${this.world.collectibles.filter(item=>item.kind==='food').length}  •  🦴 ${this.run.treasures.length} / ${this.digViews.length}`;
  }

  private positionDog(time:number,moving:boolean):void{
    const world=projectGridPoint(this.player);this.dog.setPosition(world.x,world.y+this.player.jumpLift).setDepth(worldDepth(world.y, WorldLayer.actor));
    if (!this.busy) {
      const desiredAnimation = moving ? `${this.animal.spriteKey}-run` : `${this.animal.spriteKey}-idle`;
      if (this.dogSprite.anims.currentAnim?.key !== desiredAnimation) this.dogSprite.play(desiredAnimation, true);
    }
    this.dogSprite.y = -30 + (this.animal.groundOffsetY ?? 0) + (moving && !this.busy ? Math.sin(time * .018) * 2 : 0);
    if(this.lastMove.x<-.08)this.dogSprite.setFlipX(true);else if(this.lastMove.x>.08)this.dogSprite.setFlipX(false);
  }

  private checkExit():void{
    if(this.finished||Phaser.Math.Distance.Between(this.player.x,this.player.y,this.level.exit.x,this.level.exit.y)>1.05)return;
    const requiredFood=this.requiredFood();
    if(requiredFood&&this.run.foodFound<requiredFood){this.showExitRequirement(requiredFood-this.run.foodFound);return;}
    this.finished=true;const pirateFound=this.run.treasures.some(t=>t.kind==='pirate');
    const isBest=this.run.score>animalBestScore(this.profile,this.animal.id);this.profile=addDiscoveries(this.profile,this.run.treasures.filter(t=>t.kind==='ordinary').map(t=>t.id),pirateFound);
    if(isBest)this.profile.bestScores[this.animal.id]=this.run.score;
    this.profile.bestScore=Math.max(this.profile.bestScore,this.run.score);saveProfile(this.profile);this.registry.set('profile',this.profile);
    const result:RunResults={animalId:this.animal.id,mapId:this.level.mapId,score:this.run.score,foodFound:this.run.foodFound,requiredFood,totalFood:this.world.collectibles.filter(item=>item.kind==='food').length,totalTreats:this.world.collectibles.filter(item=>item.kind==='treat').length,totalTreasures:this.digViews.length,treatsFound:this.run.treatsFound,treasures:[...this.run.treasures],pirateFound,isBest};
    this.registry.set('lastRun',result);this.audio.win();this.cameras.main.fadeOut(850,42,24,18);
    this.time.delayedCall(900,()=>this.scene.start('OwnerReturn'));
  }

  private showExitRequirement(remaining:number):void{
    if(this.time.now<this.exitReminderUntil)return;
    this.exitReminderUntil=this.time.now+2600;
    const x=this.layout.safeX+640;const y=this.layout.safeY+555;
    const bg=this.add.rectangle(0,0,520,76,0x351c14,.98).setStrokeStyle(5,0xffd65f,1);
    const text=this.add.text(0,0,`${this.animal.foodIcon}  FIND ${remaining} MORE ${remaining===1?'SNACK':'SNACKS'} FIRST!`,{fontFamily:'Fredoka, sans-serif',fontSize:'25px',color:'#fff4bd',fontStyle:'bold'}).setOrigin(.5);
    const notice=this.add.container(x,y,[bg,text]).setScrollFactor(0).setDepth(UiDepth.modal).setScale(.75).setAlpha(0);
    this.tweens.add({targets:notice,scale:{from:.75,to:1},alpha:{from:0,to:1},duration:220,ease:'Back.out',hold:1700,yoyo:true,onComplete:()=>notice.destroy()});
  }
}

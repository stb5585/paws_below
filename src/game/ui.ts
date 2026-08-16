import Phaser from 'phaser';
import { getGameLayout, type GameLayout } from './systems/layout';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  hoverColor?: number;
  fontSize?: number;
  icon?: string;
}

export function bindSafeScene(scene: Phaser.Scene, onLayout?: (layout: GameLayout) => void): () => void {
  const update = () => {
    const layout = getGameLayout(scene);
    scene.cameras.main.setScroll(-layout.safeX, -layout.safeY);
    onLayout?.(layout);
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, update));
  update();
  return update;
}

export function addViewportShade(scene: Phaser.Scene, color: number, alpha: number): Phaser.GameObjects.Rectangle {
  const shade = scene.add.rectangle(0, 0, 1, 1, color, alpha).setOrigin(0).setScrollFactor(0);
  bindSafeScene(scene, layout => shade.setPosition(0, 0).setDisplaySize(layout.width, layout.height));
  return shade;
}

export function addMenuBackground(scene: Phaser.Scene, shade = .34, texture = 'menu-burrow'): Phaser.GameObjects.Image {
  const background = scene.add.image(0, 0, texture).setScrollFactor(0).setDepth(-100);
  const overlay = scene.add.rectangle(0, 0, 1, 1, 0x170d0a, shade).setOrigin(0).setScrollFactor(0).setDepth(-99);
  bindSafeScene(scene, layout => {
    const scale = Math.max(layout.width / background.width, layout.height / background.height);
    background.setPosition(layout.centerX, layout.centerY).setScale(scale);
    overlay.setPosition(0, 0).setDisplaySize(layout.width, layout.height);
  });
  return background;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const width = options.width ?? 250;
  const height = options.height ?? 70;
  const color = options.color ?? 0xf07852;
  const hoverColor = options.hoverColor ?? 0xff9876;
  const background = scene.add.rectangle(0, 0, width, height, color, 1).setStrokeStyle(4, 0xffe5b1, .85);
  background.setInteractive({ useHandCursor: true });
  const shadow = scene.add.rectangle(0, 7, width, height, 0x25130f, .5);
  const text = scene.add.text(0, 0, `${options.icon ? `${options.icon}  ` : ''}${label}`, {
    fontFamily: 'Fredoka, Arial Rounded MT Bold, sans-serif',
    fontSize: `${options.fontSize ?? 30}px`, color: '#fff8e9', fontStyle: 'bold'
  }).setOrigin(.5);
  const container = scene.add.container(x, y, [shadow, background, text]);
  background.on('pointerover', () => { background.setFillStyle(hoverColor); container.setScale(1.035); });
  background.on('pointerout', () => { background.setFillStyle(color); container.setScale(1); });
  background.on('pointerdown', () => container.setScale(.97));
  background.on('pointerup', () => { container.setScale(1.035); onClick(); });
  container.setSize(width, height);
  return container;
}

export function addPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, alpha = .9): Phaser.GameObjects.Rectangle {
  scene.add.rectangle(x + 7, y + 10, width, height, 0x110906, Math.min(.7, alpha));
  return scene.add.rectangle(x, y, width, height, 0x2b1913, alpha).setStrokeStyle(4, 0xf3c781, .7);
}

export function heading(scene: Phaser.Scene, x: number, y: number, text: string, size = 56): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: 'Fredoka, Arial Rounded MT Bold, sans-serif', fontSize: `${size}px`,
    color: '#fff1ca', fontStyle: 'bold', stroke: '#3b2017', strokeThickness: 8, align: 'center'
  }).setOrigin(.5);
}

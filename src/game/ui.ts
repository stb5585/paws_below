import Phaser from 'phaser';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  hoverColor?: number;
  fontSize?: number;
  icon?: string;
}

export function addMenuBackground(scene: Phaser.Scene, shade = .34): Phaser.GameObjects.Image {
  const background = scene.add.image(640, 360, 'menu-burrow-v2');
  const scale = Math.max(1280 / background.width, 720 / background.height);
  background.setScale(scale).setDepth(-100);
  scene.add.rectangle(640, 360, 1280, 720, 0x170d0a, shade).setDepth(-99);
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

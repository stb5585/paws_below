import type Phaser from 'phaser';
import type { MapId } from '../types';

export interface GridAsset {
  key: string;
  url: string;
  prefix: string;
  columns: number;
  rows: number;
}

const PIP: GridAsset = { key: 'pip-animations', url: 'assets/pip-animations.webp', prefix: 'pip', columns: 4, rows: 4 };
const BUNNY: GridAsset = { key: 'bunny-animations', url: 'assets/bunny-animations.webp', prefix: 'bunny', columns: 4, rows: 4 };
const RABBIT: GridAsset = { key: 'rabbit-atlas', url: 'assets/rabbit-atlas.webp', prefix: 'rabbit', columns: 4, rows: 2 };
const BURROW: GridAsset = { key: 'burrow-atlas', url: 'assets/burrow-atlas.webp', prefix: 'env', columns: 4, rows: 4 };
const HOUSEHOLD: GridAsset = { key: 'household-treasures', url: 'assets/household-treasures.webp', prefix: 'treasure', columns: 4, rows: 2 };
const FARM: GridAsset = { key: 'farm-atlas', url: 'assets/farm-atlas.webp', prefix: 'farm', columns: 4, rows: 4 };
const FARM_TREASURES: GridAsset = { key: 'farm-treasures', url: 'assets/farm-treasures.webp', prefix: 'farm-treasure', columns: 4, rows: 2 };

export const GRID_ASSETS: readonly GridAsset[] = [PIP, BUNNY, RABBIT, BURROW, HOUSEHOLD, FARM, FARM_TREASURES];

function queue(scene: Phaser.Scene, asset: GridAsset): void {
  if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, asset.url);
}

export function queueAnimalPortraits(scene: Phaser.Scene): void {
  queue(scene, PIP);
  queue(scene, BUNNY);
}

export function queueWorldAssets(scene: Phaser.Scene, mapId: MapId, animalId: string): void {
  if (mapId === 'farm') {
    queue(scene, FARM);
    queue(scene, FARM_TREASURES);
    return;
  }
  queue(scene, BURROW);
  queue(scene, HOUSEHOLD);
  if (animalId === 'cream-bunny') queue(scene, RABBIT);
}

export function queueCollectionAssets(scene: Phaser.Scene, mapId: MapId): void {
  queue(scene, mapId === 'farm' ? FARM_TREASURES : HOUSEHOLD);
}

function registerGridFrames(scene: Phaser.Scene, asset: GridAsset): void {
  if (!scene.textures.exists(asset.key)) return;
  const texture = scene.textures.get(asset.key);
  if (texture.has(`${asset.prefix}-0`)) return;
  const source = texture.getSourceImage() as HTMLImageElement;
  for (let row = 0; row < asset.rows; row++) {
    for (let column = 0; column < asset.columns; column++) {
      const x0 = Math.round(column * source.width / asset.columns);
      const y0 = Math.round(row * source.height / asset.rows);
      const x1 = Math.round((column + 1) * source.width / asset.columns);
      const y1 = Math.round((row + 1) * source.height / asset.rows);
      texture.add(`${asset.prefix}-${row * asset.columns + column}`, 0, x0, y0, x1 - x0, y1 - y0);
    }
  }
}

function createAnimalAnimations(scene: Phaser.Scene, texture: string, prefix: string): void {
  if (!scene.textures.exists(texture)) return;
  const animation = (key: string, frames: number[], frameRate: number, repeat: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map(frame => ({ key: texture, frame: `${prefix}-${frame}` })),
      frameRate,
      repeat
    });
  };
  animation(`${prefix}-run`, [0, 1, 2, 3], 10, -1);
  animation(`${prefix}-dig`, [4, 5, 6, 7], 8, 1);
  animation(`${prefix}-jump`, [8, 9, 10, 11], 9, 0);
  animation(`${prefix}-action`, [12, 13, 12], 7, 0);
  animation(`${prefix}-idle`, [14, 15], 2, -1);
  if (prefix === 'pip' && !scene.anims.exists('pip-bark')) {
    scene.anims.create({
      key: 'pip-bark',
      frames: [12, 13, 12].map(frame => ({ key: texture, frame: `pip-${frame}` })),
      frameRate: 7,
      repeat: 0
    });
  }
}

export function registerLoadedAssets(scene: Phaser.Scene): void {
  GRID_ASSETS.forEach(asset => registerGridFrames(scene, asset));
  createAnimalAnimations(scene, PIP.key, PIP.prefix);
  createAnimalAnimations(scene, BUNNY.key, BUNNY.prefix);
}

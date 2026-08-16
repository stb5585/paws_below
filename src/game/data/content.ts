import type { AnimalDefinition, BuriedTreasureDefinition, LevelDefinition, MapId, PowerDefinition } from '../types';

export const DOG: AnimalDefinition = {
  id: 'white-dog',
  name: 'dog',
  displayName: 'Pip',
  baseSpeed: 2.65,
  spriteKey: 'pip',
  spriteTexture: 'pip-animations',
  foodName: 'snacks',
  foodIcon: '🍖',
  homeName: 'doghouse',
  actionLabel: 'BARK',
  actionIcon: '🐶',
  homeTexture: 'burrow-atlas',
  homeFrame: 'env-4',
  goal: { type: 'reachExit', exitId: 'cozy-doghouse' }
};

export const BUNNY: AnimalDefinition = {
  id: 'cream-bunny',
  name: 'bunny',
  displayName: 'Mochi',
  baseSpeed: 2.8,
  spriteKey: 'bunny',
  spriteTexture: 'bunny-animations',
  foodName: 'rabbit foods',
  foodIcon: '🥕',
  homeName: 'rabbit pen',
  actionLabel: 'HONK',
  actionIcon: '📯',
  homeTexture: 'rabbit-atlas',
  homeFrame: 'rabbit-0',
  goal: { type: 'reachExit', exitId: 'cozy-rabbit-pen' },
  portraitScale: 1.08,
  portraitOffsetX: 0,
  portraitOffsetY: 0,
  gameScale: 1.2,
  groundOffsetY: -8
};

export const ANIMALS: AnimalDefinition[] = [DOG, BUNNY];
export const getAnimal = (id: string | undefined): AnimalDefinition => ANIMALS.find(animal => animal.id === id) ?? DOG;

export const BURROW: LevelDefinition = {
  id: 'burrow-maze-1',
  animalId: DOG.id,
  mapId: 'underground',
  mapKey: 'burrow-map',
  title: 'The Buried Burrow',
  goal: DOG.goal,
  start: { x: 6, y: 4 },
  exit: { x: 28, y: 18 }
};

export const RABBIT_BURROW: LevelDefinition = {
  id: 'rabbit-burrow-1',
  animalId: BUNNY.id,
  mapId: 'underground',
  mapKey: 'burrow-map',
  title: 'The Carrot Burrow',
  goal: BUNNY.goal,
  start: { x: 6, y: 4 },
  exit: { x: 28, y: 18 }
};

export const DOG_FARM: LevelDefinition = {
  id: 'dog-farm-1', animalId: DOG.id, mapId: 'farm', mapKey: 'farm-field', title: 'Sunny Farm Field',
  goal: { type: 'collectThenReachExit', collectibleKind: 'food', target: 12, exitId: 'red-barn' },
  start: { x: 4, y: 4 }, exit: { x: 29, y: 19 }
};

export const BUNNY_FARM: LevelDefinition = {
  id: 'bunny-farm-1', animalId: BUNNY.id, mapId: 'farm', mapKey: 'farm-field', title: 'Sunny Farm Field',
  goal: { type: 'collectThenReachExit', collectibleKind: 'food', target: 12, exitId: 'red-barn' },
  start: { x: 4, y: 4 }, exit: { x: 29, y: 19 }
};

export const LEVELS: LevelDefinition[] = [BURROW, RABBIT_BURROW, DOG_FARM, BUNNY_FARM];
export const getLevelForAnimal = (animalId: string, mapId: MapId = 'underground'): LevelDefinition =>
  LEVELS.find(level => level.animalId === animalId && level.mapId === mapId) ?? BURROW;

export const POWERS: Record<string, PowerDefinition> = {
  zoomie: { kind: 'zoomie', label: 'ZOOMIES!', durationMs: 7_000, color: 0xff8765 },
  glow: { kind: 'glow', label: 'BIG GLOW!', durationMs: 10_000, color: 0xffdf78 },
  sniff: { kind: 'sniff', label: 'SUPER SNIFF!', durationMs: 6_000, color: 0x79d9dc }
};

export const ZOOMIE_SPEED_MULTIPLIER = 1.9;

export const TREASURE_CATALOG: BuriedTreasureDefinition[] = [
  { id: 'dino-bone', name: 'Dinosaur Bone', icon: '🦴', kind: 'ordinary', points: 100 },
  { id: 'striped-sock', name: 'Striped Sock', icon: '🧦', kind: 'ordinary', points: 100 },
  { id: 'red-slipper', name: 'Red Slipper', icon: '👟', kind: 'ordinary', points: 100 },
  { id: 'house-keys', name: 'House Keys', icon: '🔑', kind: 'ordinary', points: 100 },
  { id: 'tennis-ball', name: 'Tennis Ball', icon: '🎾', kind: 'ordinary', points: 100 },
  { id: 'tv-remote', name: 'TV Remote', icon: '📺', kind: 'ordinary', points: 100 },
  { id: 'teddy-bear', name: 'Teddy Bear', icon: '🧸', kind: 'ordinary', points: 100 },
  { id: 'garden-glove', name: 'Garden Glove', icon: '🧤', kind: 'ordinary', points: 100 }
];

export const TREASURE_SPRITE_FRAMES: Record<string, number> = Object.fromEntries(
  TREASURE_CATALOG.map((treasure, index) => [treasure.id, index])
);

export const PIRATE_TREASURE: BuriedTreasureDefinition = {
  id: 'pirate-chest', name: 'Pirate Treasure', icon: '🏴‍☠️', kind: 'pirate', points: 500
};

export const FARM_TREASURE_CATALOG: BuriedTreasureDefinition[] = [
  { id: 'lucky-horseshoe', name: 'Lucky Horseshoe', icon: '🧲', kind: 'ordinary', points: 125 },
  { id: 'milk-can', name: 'Milk Can', icon: '🥛', kind: 'ordinary', points: 125 },
  { id: 'egg-basket', name: 'Egg Basket', icon: '🥚', kind: 'ordinary', points: 125 },
  { id: 'watering-can', name: 'Watering Can', icon: '🚿', kind: 'ordinary', points: 125 },
  { id: 'work-glove', name: 'Work Glove', icon: '🧤', kind: 'ordinary', points: 125 },
  { id: 'farm-bandana', name: 'Farm Bandana', icon: '🔷', kind: 'ordinary', points: 125 },
  { id: 'hand-trowel', name: 'Hand Trowel', icon: '🪏', kind: 'ordinary', points: 125 },
  { id: 'toy-tractor', name: 'Toy Tractor', icon: '🚜', kind: 'ordinary', points: 125 }
];

export const FARM_TREASURE_SPRITE_FRAMES: Record<string, number> = Object.fromEntries(
  FARM_TREASURE_CATALOG.map((treasure, index) => [treasure.id, index])
);

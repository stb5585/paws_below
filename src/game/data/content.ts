import type { AnimalDefinition, BuriedTreasureDefinition, LevelDefinition, PowerDefinition } from '../types';

export const DOG: AnimalDefinition = {
  id: 'white-dog',
  name: 'dog',
  displayName: 'Pip',
  baseSpeed: 2.65,
  spriteKey: 'pip',
  goal: { type: 'reachExit', exitId: 'cozy-doghouse' }
};

export const BURROW: LevelDefinition = {
  id: 'burrow-maze-1',
  animalId: DOG.id,
  mapKey: 'burrow-map',
  title: 'The Buried Burrow',
  goal: DOG.goal,
  start: { x: 6, y: 4 },
  exit: { x: 28, y: 18 }
};

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

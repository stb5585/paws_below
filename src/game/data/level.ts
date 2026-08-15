import type { CollectibleDefinition, DigSpotDefinition, GridPoint, PowerKind } from '../types';

export const TILE_W = 96;
export const TILE_H = 48;

export interface GridRect { x: number; y: number; width: number; height: number }

export const ROOMS: GridRect[] = [
  { x: 2, y: 2, width: 6, height: 5 },
  { x: 7, y: 3, width: 7, height: 3 },
  { x: 13, y: 1, width: 6, height: 9 },
  { x: 21, y: 1, width: 11, height: 9 },
  { x: 22, y: 13, width: 11, height: 9 },
  { x: 10, y: 13, width: 10, height: 9 }
];

export const BLOCKS: GridRect[] = [
  { x: 4, y: 3, width: 1, height: 2 },
  { x: 14, y: 2, width: 2, height: 2 },
  { x: 16, y: 6, width: 2, height: 2 },
  { x: 23, y: 2, width: 2, height: 4 },
  { x: 27, y: 5, width: 3, height: 2 },
  { x: 30, y: 2, width: 1, height: 3 },
  { x: 24, y: 15, width: 3, height: 2 },
  { x: 29, y: 14, width: 2, height: 3 },
  { x: 27, y: 19, width: 2, height: 2 },
  { x: 12, y: 15, width: 2, height: 3 },
  { x: 16, y: 18, width: 3, height: 2 }
];

export const LAVA_RECTS: GridRect[] = [
  { x: 19, y: 2, width: 2, height: 5 },
  { x: 24, y: 10, width: 7, height: 3 },
  { x: 12, y: 10, width: 7, height: 3 }
];

export const JUMP_PATHS: GridPoint[][] = [
  [{ x: 18, y: 4 }, { x: 19, y: 4 }, { x: 20, y: 4 }, { x: 21, y: 4 }],
  [{ x: 27, y: 9 }, { x: 27, y: 10 }, { x: 27, y: 11 }, { x: 27, y: 12 }, { x: 27, y: 13 }],
  [{ x: 15, y: 9 }, { x: 15, y: 10 }, { x: 15, y: 11 }, { x: 15, y: 12 }, { x: 15, y: 13 }]
];

const FOOD_POINTS: GridPoint[] = [
  {x:3,y:3},{x:3,y:5},{x:6,y:5},{x:8,y:4},{x:10,y:4},{x:12,y:4},
  {x:13,y:7},{x:14,y:5},{x:17,y:4},{x:17,y:8},{x:21,y:4},{x:22,y:7},
  {x:26,y:2},{x:28,y:3},{x:31,y:4},{x:26,y:8},{x:30,y:8},{x:27,y:13},
  {x:23,y:14},{x:31,y:13},{x:23,y:18},{x:25,y:20},{x:30,y:18},{x:31,y:21},
  {x:15,y:13},{x:10,y:14},{x:11,y:20},{x:15,y:21},{x:19,y:14},{x:19,y:21}
];

const TREAT_POINTS: Array<GridPoint & { power: PowerKind }> = [
  {x:6,y:2,power:'zoomie'}, {x:18,y:8,power:'zoomie'},
  {x:22,y:2,power:'glow'}, {x:30,y:9,power:'glow'},
  {x:22,y:20,power:'sniff'}, {x:10,y:18,power:'sniff'}
];

export const COLLECTIBLES: CollectibleDefinition[] = [
  ...FOOD_POINTS.map((position, index) => ({ id: `food-${index + 1}`, kind: 'food' as const, position, points: 10 })),
  ...TREAT_POINTS.map((item, index) => ({ id: `treat-${index + 1}`, kind: 'treat' as const, position: {x:item.x,y:item.y}, points: 50, power: item.power }))
];

export const ORDINARY_DIG_SPOTS: DigSpotDefinition[] = [
  {id:'dig-1',x:7,y:2},{id:'dig-2',x:13,y:9},{id:'dig-3',x:22,y:9},{id:'dig-4',x:31,y:2},
  {id:'dig-5',x:23,y:21},{id:'dig-6',x:32,y:20},{id:'dig-7',x:10,y:21},{id:'dig-8',x:19,y:16}
];

export const PIRATE_DIG_SPOTS: DigSpotDefinition[] = [
  {id:'pirate-1',x:18,y:1,pirateEligible:true},
  {id:'pirate-2',x:32,y:13,pirateEligible:true},
  {id:'pirate-3',x:11,y:13,pirateEligible:true}
];

export function pointInRect(x: number, y: number, rect: GridRect): boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

export function isFloorCell(x: number, y: number): boolean {
  return ROOMS.some(rect => pointInRect(x, y, rect)) && !BLOCKS.some(rect => pointInRect(x, y, rect));
}

export function isLavaCell(x: number, y: number): boolean {
  return LAVA_RECTS.some(rect => pointInRect(x, y, rect));
}

export function gridToWorld(point: GridPoint): GridPoint {
  return { x: 1650 + (point.x - point.y) * TILE_W / 2, y: 80 + (point.x + point.y) * TILE_H / 2 };
}

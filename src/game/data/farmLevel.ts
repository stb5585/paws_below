import type { CollectibleDefinition, DigSpotDefinition, GridPoint, PowerKind } from '../types';
import { pointInRect, type GridRect } from './level';

export const FARM_WIDTH = 34;
export const FARM_HEIGHT = 24;
export const FARM_ROOMS: GridRect[] = [{ x: 2, y: 2, width: 30, height: 20 }];
export const FARM_BLOCKS: GridRect[] = [
  { x: 8, y: 2, width: 2, height: 6 }, { x: 8, y: 10, width: 2, height: 12 },
  { x: 16, y: 4, width: 2, height: 7 }, { x: 16, y: 13, width: 2, height: 9 },
  { x: 24, y: 2, width: 2, height: 5 }, { x: 24, y: 9, width: 2, height: 13 },
  { x: 10, y: 15, width: 3, height: 2 }, { x: 18, y: 5, width: 6, height: 2 }
];

export const FARM_OBSTACLE_RECTS: GridRect[] = [
  { x: 11, y: 8, width: 1, height: 1 },
  { x: 20, y: 11, width: 1, height: 1 },
  { x: 27, y: 16, width: 1, height: 1 }
];

export const FARM_JUMP_PATHS: GridPoint[][] = [
  [{ x: 11, y: 7 }, { x: 11, y: 8 }, { x: 11, y: 9 }],
  [{ x: 20, y: 10 }, { x: 20, y: 11 }, { x: 20, y: 12 }],
  [{ x: 26, y: 16 }, { x: 27, y: 16 }, { x: 28, y: 16 }]
];

const FOOD_POINTS: GridPoint[] = [
  {x:3,y:3},{x:6,y:5},{x:7,y:7},{x:3,y:10},{x:6,y:12},{x:4,y:16},{x:7,y:19},{x:3,y:21},
  {x:10,y:3},{x:12,y:3},{x:15,y:2},{x:10,y:7},{x:14,y:9},{x:10,y:12},{x:12,y:19},{x:15,y:21},
  {x:17,y:2},{x:20,y:3},{x:23,y:4},{x:18,y:8},{x:22,y:10},{x:18,y:12},{x:21,y:19},
  {x:26,y:3},{x:28,y:4},{x:31,y:6},{x:26,y:8},{x:30,y:11},{x:26,y:14},{x:29,y:18}
];

const TREAT_POINTS: Array<GridPoint & { power: PowerKind }> = [
  {x:6,y:3,power:'zoomie'},{x:6,y:20,power:'zoomie'},
  {x:12,y:6,power:'glow'},{x:19,y:9,power:'glow'},
  {x:22,y:18,power:'sniff'},{x:30,y:20,power:'sniff'}
];

export const FARM_COLLECTIBLES: CollectibleDefinition[] = [
  ...FOOD_POINTS.map((position, index) => ({ id: `farm-food-${index + 1}`, kind: 'food' as const, position, points: 10, pickupRadius: .95 })),
  ...TREAT_POINTS.map((item, index) => ({ id: `farm-treat-${index + 1}`, kind: 'treat' as const, position: {x:item.x,y:item.y}, points: 50, power: item.power, pickupRadius: 1.15 }))
];

export const FARM_DIG_SPOTS: DigSpotDefinition[] = [
  {id:'farm-dig-1',x:3,y:6},{id:'farm-dig-2',x:7,y:14},{id:'farm-dig-3',x:10,y:4},{id:'farm-dig-4',x:14,y:12},
  {id:'farm-dig-5',x:18,y:3},{id:'farm-dig-6',x:22,y:14},{id:'farm-dig-7',x:27,y:10},{id:'farm-dig-8',x:31,y:20}
];

export function isFarmObstacleCell(x: number, y: number): boolean {
  return FARM_OBSTACLE_RECTS.some(rect => pointInRect(x, y, rect));
}

export function isFarmFloorCell(x: number, y: number): boolean {
  return FARM_ROOMS.some(rect => pointInRect(x, y, rect))
    && !FARM_BLOCKS.some(rect => pointInRect(x, y, rect))
    && !isFarmObstacleCell(x, y);
}

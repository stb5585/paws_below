import type { GridPoint } from '../types';

/**
 * Isometric objects above the ground are sorted by the screen-space Y
 * coordinate where they touch it. Layer offsets only resolve ties at the same
 * contact point; they must never be large enough to overtake an object on a
 * lower row. Floor surfaces use GroundDepth instead so they can never occlude
 * an actor farther up the screen.
 */
export const WORLD_DEPTH_STRIDE = 100;

export interface IsometricProjection {
  tileWidth: number;
  tileHeight: number;
  origin: GridPoint;
}

export const GAME_PROJECTION: Readonly<IsometricProjection> = {
  tileWidth: 96,
  tileHeight: 48,
  origin: { x: 1650, y: 80 }
};

export function projectGridPoint(point: GridPoint, projection: IsometricProjection = GAME_PROJECTION): GridPoint {
  return {
    x: projection.origin.x + (point.x - point.y) * projection.tileWidth / 2,
    y: projection.origin.y + (point.x + point.y) * projection.tileHeight / 2
  };
}

export function diamondPoints(projection: IsometricProjection = GAME_PROJECTION): number[] {
  return [
    0, -projection.tileHeight / 2,
    projection.tileWidth / 2, 0,
    0, projection.tileHeight / 2,
    -projection.tileWidth / 2, 0
  ];
}

export const WorldLayer = {
  prop: 30,
  interactive: 40,
  actor: 50,
  effect: 90
} as const;

export const GroundDepth = {
  base: 0,
  detail: 10
} as const;

export const UiDepth = {
  hud: 1_000_000,
  hudContent: 1_000_010,
  prompt: 1_000_020,
  touchMarker: 1_000_090,
  touchControl: 1_000_100,
  touchContent: 1_000_110,
  announcement: 1_000_200,
  modal: 1_000_300
} as const;

export type WorldLayerOffset = typeof WorldLayer[keyof typeof WorldLayer];

export function worldDepth(groundY: number, layer: WorldLayerOffset = WorldLayer.prop): number {
  return Math.round(groundY * WORLD_DEPTH_STRIDE) + layer;
}

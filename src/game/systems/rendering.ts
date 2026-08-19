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

export function diamondHalfToward(
  direction: GridPoint,
  projection: IsometricProjection = GAME_PROJECTION
): number[] {
  const { x, y } = direction;
  if (Math.abs(x) + Math.abs(y) !== 1) {
    throw new Error('A diamond half must face one adjacent grid cell');
  }
  const halfWidth = projection.tileWidth / 2;
  const halfHeight = projection.tileHeight / 2;
  if (x > 0) return [0, 0, halfWidth, 0, 0, halfHeight];
  if (x < 0) return [0, 0, -halfWidth, 0, 0, -halfHeight];
  if (y > 0) return [0, 0, -halfWidth, 0, 0, halfHeight];
  return [0, 0, 0, -halfHeight, halfWidth, 0];
}

export function blendRgb(from: number, to: number, amount: number): number {
  const t = Math.max(0, Math.min(1, amount));
  const channel = (shift: number) => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function visibilityTint(amount: number): number {
  const channel = Math.round(255 * Math.max(.08, Math.min(1, amount)));
  return (channel << 16) | (channel << 8) | channel;
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

export const ACTOR_OCCLUDER_DISTANCE = 1.5;
export const ACTOR_OCCLUSION_ALPHA = .55;

export type WorldLayerOffset = typeof WorldLayer[keyof typeof WorldLayer];

export function worldDepth(groundY: number, layer: WorldLayerOffset = WorldLayer.prop): number {
  return Math.round(groundY * WORLD_DEPTH_STRIDE) + layer;
}

export function actorOverlayDepth(occluderDepths: readonly number[]): number | undefined {
  return occluderDepths.length ? Math.max(...occluderDepths) + 1 : undefined;
}

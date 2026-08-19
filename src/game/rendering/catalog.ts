import type Phaser from 'phaser';
import type { GridPoint } from '../types';
import { WorldLayer, projectGridPoint, worldDepth, type WorldLayerOffset } from '../systems/rendering';

export type EnvironmentAssetId =
  | 'burrow-floor' | 'burrow-wall' | 'burrow-stone'
  | 'burrow-mushroom' | 'burrow-crystal' | 'burrow-root' | 'burrow-lantern' | 'burrow-web'
  | 'farm-grass' | 'farm-corn' | 'farm-barn' | 'farm-landmark' | 'farm-stone-a' | 'farm-stone-b'
  | 'farm-boundary-fence' | 'farm-sign' | 'farm-border-detail' | 'farm-flowers' | 'farm-shrub';

export interface GridFootprint {
  width: number;
  height: number;
}

/**
 * A sprite is positioned at the grid cell's ground-contact point. `groundAnchor`
 * is normalized within the source frame, so resizing a sprite does not require
 * another hand-tuned pixel lift.
 */
export interface ProjectedSpriteAsset {
  id: string;
  texture: string;
  frame: string;
  displaySize: number;
  groundAnchor: Readonly<GridPoint>;
  footprint: Readonly<GridFootprint>;
  placementOffset?: Readonly<GridPoint>;
  depthOffset?: Readonly<GridPoint>;
  flipX?: boolean;
  standingLift?: number;
}

type ProjectedSpriteOptions = Pick<ProjectedSpriteAsset,
  'placementOffset' | 'depthOffset' | 'flipX' | 'standingLift'>;

const asset = (
  id: EnvironmentAssetId,
  texture: string,
  frame: string,
  displaySize: number,
  groundAnchorY: number,
  footprint: GridFootprint = { width: 1, height: 1 },
  options: ProjectedSpriteOptions = {}
): ProjectedSpriteAsset => ({
  id, texture, frame, displaySize, groundAnchor: { x: .5, y: groundAnchorY }, footprint, ...options
});

export const ENVIRONMENT_ASSETS: Readonly<Record<EnvironmentAssetId, ProjectedSpriteAsset>> = {
  'burrow-floor': asset('burrow-floor', 'burrow-atlas', 'env-0', 112, .536),
  'burrow-wall': asset('burrow-wall', 'burrow-atlas', 'env-1', 118, .763),
  'burrow-stone': asset('burrow-stone', 'burrow-atlas', 'env-3', 80, .613, { width: 1, height: 1 }, { standingLift: 12 }),
  'burrow-mushroom': asset('burrow-mushroom', 'burrow-atlas', 'env-5', 76, .92),
  'burrow-crystal': asset('burrow-crystal', 'burrow-atlas', 'env-6', 80, .92),
  'burrow-root': asset('burrow-root', 'burrow-atlas', 'env-7', 76, .92),
  'burrow-lantern': asset('burrow-lantern', 'burrow-atlas', 'env-13', 64, .92),
  'burrow-web': asset('burrow-web', 'burrow-atlas', 'env-15', 64, .92),
  'farm-grass': asset('farm-grass', 'farm-atlas', 'farm-0', 110, .536),
  'farm-corn': asset('farm-corn', 'farm-atlas', 'farm-1', 118, .763),
  'farm-barn': asset('farm-barn', 'farm-atlas', 'farm-2', 220, .8, { width: 2, height: 2 }),
  'farm-landmark': asset('farm-landmark', 'farm-atlas', 'farm-3', 138, .812, { width: 2, height: 2 }),
  'farm-stone-a': asset('farm-stone-a', 'farm-atlas', 'farm-4', 76, .697, { width: 1, height: 1 }, { standingLift: 22 }),
  'farm-stone-b': asset('farm-stone-b', 'farm-atlas', 'farm-4', 76, .697, { width: 1, height: 1 }, { standingLift: 22, flipX: true }),
  'farm-boundary-fence': asset('farm-boundary-fence', 'farm-atlas', 'farm-5', 160, .92, { width: 1, height: 2 }, {
    placementOffset: { x: 0, y: .5 }, depthOffset: { x: 0, y: 1 }, flipX: true
  }),
  'farm-sign': asset('farm-sign', 'farm-atlas', 'farm-7', 72, .92),
  'farm-border-detail': asset('farm-border-detail', 'farm-atlas', 'farm-13', 118, .763),
  'farm-flowers': asset('farm-flowers', 'farm-atlas', 'farm-14', 66, .92),
  'farm-shrub': asset('farm-shrub', 'farm-atlas', 'farm-15', 70, .92)
};

export interface SpritePlacementOptions {
  size?: number;
  layer?: WorldLayerOffset;
  depth?: number;
  alpha?: number;
}

export interface WorldPropPlacement extends GridPoint {
  asset: EnvironmentAssetId;
  size?: number;
  animated?: boolean;
}

export interface BorderVariant {
  asset: EnvironmentAssetId;
  modulus: number;
  remainder: number;
}

export interface WorldRenderProfile {
  floorAsset: EnvironmentAssetId;
  wallAsset: EnvironmentAssetId;
  blockAsset: EnvironmentAssetId;
  crossingAssets: EnvironmentAssetId[];
  borderVariants: BorderVariant[];
  landmarks: WorldPropPlacement[];
  decor: WorldPropPlacement[];
}

export function placeProjectedSprite(
  scene: Phaser.Scene,
  point: GridPoint,
  definition: ProjectedSpriteAsset,
  options: SpritePlacementOptions = {}
): Phaser.GameObjects.Image {
  const placementOffset = definition.placementOffset ?? { x: 0, y: 0 };
  const depthOffset = definition.depthOffset ?? placementOffset;
  const position = projectGridPoint({ x: point.x + placementOffset.x, y: point.y + placementOffset.y });
  const depthPosition = projectGridPoint({ x: point.x + depthOffset.x, y: point.y + depthOffset.y });
  const size = options.size ?? definition.displaySize;
  const image = scene.add.image(position.x, position.y, definition.texture, definition.frame)
    .setOrigin(definition.groundAnchor.x, definition.groundAnchor.y)
    .setDisplaySize(size, size)
    .setDepth(options.depth ?? worldDepth(depthPosition.y, options.layer ?? WorldLayer.prop))
    .setFlipX(definition.flipX ?? false);
  if (options.alpha !== undefined) image.setAlpha(options.alpha);
  return image;
}

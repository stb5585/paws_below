import { describe, expect, it } from 'vitest';
import {
  GAME_PROJECTION, GroundDepth, UiDepth, WORLD_DEPTH_STRIDE, WorldLayer,
  actorOverlayDepth, diamondPoints, projectGridPoint, worldDepth
} from '../src/game/systems/rendering';
import { ENVIRONMENT_ASSETS, placementForWallSpan, wallInsetTowardGround } from '../src/game/rendering/catalog';

describe('isometric rendering order', () => {
  it('keeps the complete floor below y-sorted actors', () => {
    const actorAtHighestSupportedWorldPoint = worldDepth(GAME_PROJECTION.origin.y, WorldLayer.actor);
    expect(GroundDepth.base).toBeLessThan(GroundDepth.detail);
    expect(GroundDepth.detail).toBeLessThan(actorAtHighestSupportedWorldPoint);
  });

  it('uses layers only to break ties at the same contact point', () => {
    const groundY = 320;
    const depths = [
      WorldLayer.prop,
      WorldLayer.interactive,
      WorldLayer.actor,
      WorldLayer.effect
    ].map(layer => worldDepth(groundY, layer));
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    expect(depths.at(-1)! - depths[0]).toBeLessThan(WORLD_DEPTH_STRIDE);
  });

  it('keeps fixed interface layers above the complete supported world', () => {
    expect(UiDepth.hud).toBeGreaterThan(worldDepth(1_650, WorldLayer.effect));
    expect(UiDepth.modal).toBeGreaterThan(UiDepth.touchContent);
  });

  it('places the visibility overlay above a complete occluding section', () => {
    expect(actorOverlayDepth([])).toBeUndefined();
    expect(actorOverlayDepth([80, 120, 110])).toBe(121);
  });

  it('projects grid coordinates through one explicit isometric contract', () => {
    expect(projectGridPoint({ x: 0, y: 0 })).toEqual(GAME_PROJECTION.origin);
    expect(projectGridPoint({ x: 1, y: 0 })).toEqual({ x: 1698, y: 104 });
    expect(projectGridPoint({ x: 0, y: 1 })).toEqual({ x: 1602, y: 104 });
    expect(diamondPoints()).toEqual([0, -24, 48, 0, 0, 24, -48, 0]);
  });

  it('defines normalized ground anchors and footprints for every environment asset', () => {
    Object.values(ENVIRONMENT_ASSETS).forEach(asset => {
      expect(asset.groundAnchor.x, asset.id).toBeGreaterThanOrEqual(0);
      expect(asset.groundAnchor.x, asset.id).toBeLessThanOrEqual(1);
      expect(asset.groundAnchor.y, asset.id).toBeGreaterThanOrEqual(0);
      expect(asset.groundAnchor.y, asset.id).toBeLessThanOrEqual(1);
      expect(asset.footprint.width, asset.id).toBeGreaterThan(0);
      expect(asset.footprint.height, asset.id).toBeGreaterThan(0);
    });
  });

  it('keeps farm fence orientation in placement metadata rather than the asset', () => {
    const fence = ENVIRONMENT_ASSETS['farm-boundary-fence'];
    expect(fence.frame).toBe('farm-5');
    expect(fence.flipX).toBeUndefined();
    expect(fence.footprint).toEqual({ width: 2, height: 1 });
    expect(fence.placementOffset).toBeUndefined();
    expect(fence.depthOffset).toBeUndefined();
    expect(fence.displaySize).toBeGreaterThan(GAME_PROJECTION.tileWidth);
  });

  it('orients and depth-sorts a fence from the two wall cells it replaces', () => {
    expect(placementForWallSpan({ x: 3, y: 4 }, { x: 4, y: 4 })).toEqual({
      placementOffset: { x: .5, y: 0 }, depthOffset: { x: 1, y: 0 }, flipX: false,
      footprint: { width: 2, height: 1 }
    });
    expect(placementForWallSpan({ x: 3, y: 4 }, { x: 3, y: 5 })).toEqual({
      placementOffset: { x: 0, y: .5 }, depthOffset: { x: 0, y: 1 }, flipX: true,
      footprint: { width: 1, height: 2 }
    });
    expect(placementForWallSpan({ x: 3, y: 4 }, { x: 2, y: 4 }).depthOffset).toEqual({ x: 0, y: 0 });
    expect(() => placementForWallSpan({ x: 3, y: 4 }, { x: 5, y: 4 })).toThrow();
  });

  it('anchors outside walls halfway toward their neighboring ground', () => {
    expect(wallInsetTowardGround([{ x: 0, y: 1 }])).toEqual({ x: 0, y: .5 });
    expect(wallInsetTowardGround([{ x: -1, y: 0 }])).toEqual({ x: -.5, y: 0 });
    expect(wallInsetTowardGround([{ x: 1, y: 0 }, { x: 0, y: 1 }])).toEqual({ x: .25, y: .25 });
    expect(wallInsetTowardGround([{ x: 1, y: 0 }, { x: -1, y: 0 }])).toEqual({ x: 0, y: 0 });
    expect(wallInsetTowardGround([])).toEqual({ x: 0, y: 0 });
    expect(() => wallInsetTowardGround([{ x: 1, y: 1 }])).toThrow();
  });

  it('uses hay bales with explicit standing height for every farm crossing variant', () => {
    ['farm-stone-a', 'farm-stone-b'].forEach(id => {
      const crossing = ENVIRONMENT_ASSETS[id as 'farm-stone-a' | 'farm-stone-b'];
      expect(crossing.frame).toBe('farm-4');
      expect(crossing.standingLift).toBeGreaterThan(0);
    });
    expect(ENVIRONMENT_ASSETS['burrow-stone'].standingLift).toBeGreaterThan(0);
  });
});

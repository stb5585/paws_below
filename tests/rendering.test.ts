import { describe, expect, it } from 'vitest';
import {
  ACTOR_OCCLUDER_MIN_ALPHA, GAME_PROJECTION, GroundDepth, UiDepth, WORLD_DEPTH_STRIDE, WorldLayer,
  actorOccluderAlpha, diamondPoints, projectGridPoint, worldDepth
} from '../src/game/systems/rendering';
import { ENVIRONMENT_ASSETS } from '../src/game/rendering/catalog';

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

  it('fades only nearby objects that sort in front of the actor', () => {
    expect(actorOccluderAlpha(1, 1, true)).toBe(ACTOR_OCCLUDER_MIN_ALPHA);
    expect(actorOccluderAlpha(1, 1.25, true)).toBeCloseTo(.7);
    expect(actorOccluderAlpha(1, 1.5, true)).toBe(1);
    expect(actorOccluderAlpha(1, 1, false)).toBe(1);
    expect(actorOccluderAlpha(.25, 1, true)).toBe(.25);
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
});

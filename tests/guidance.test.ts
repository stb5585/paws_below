import { describe, expect, it } from 'vitest';
import { nearestUndugTreasure, TREASURE_BARK_RADIUS } from '../src/game/systems/guidance';
import { TREASURE_CATALOG } from '../src/game/data/content';
import type { ActiveDigSpot } from '../src/game/types';

const spot = (id: string, x: number, y: number, dug = false): ActiveDigSpot => ({
  id, x, y, dug, treasure: TREASURE_CATALOG[0]
});

describe('bark treasure guidance', () => {
  it('finds only the nearest undug treasure inside bark range', () => {
    const near = spot('near', 2, 0);
    expect(nearestUndugTreasure({ x: 0, y: 0 }, [spot('dug', 1, 0, true), spot('far', 4, 0), near])).toBe(near);
  });

  it('does not reveal treasure beyond the sniffing radius', () => {
    expect(nearestUndugTreasure({ x: 0, y: 0 }, [spot('outside', TREASURE_BARK_RADIUS + .01, 0)])).toBeUndefined();
  });
});

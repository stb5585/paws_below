import { describe, expect, it } from 'vitest';
import { PIRATE_TREASURE, TREASURE_CATALOG, TREASURE_SPRITE_FRAMES, ZOOMIE_SPEED_MULTIPLIER } from '../src/game/data/content';
import { RunState } from '../src/game/systems/runState';

describe('run scoring and powers', () => {
  it('scores food, treats, ordinary treasures, and pirate treasure', () => {
    const run = new RunState();
    run.collectFood();
    run.collectTreat('zoomie', 1_000);
    run.collectTreasure(TREASURE_CATALOG[0]);
    run.collectTreasure(PIRATE_TREASURE);
    expect(run.score).toBe(660);
    expect(run.foodFound).toBe(1);
    expect(run.treatsFound).toBe(1);
  });

  it('refreshes power duration and expires at the configured time', () => {
    const run = new RunState();
    run.collectTreat('zoomie', 1_000);
    expect(run.isPowerActive('zoomie', 7_999)).toBe(true);
    expect(run.isPowerActive('zoomie', 8_000)).toBe(false);
    run.collectTreat('zoomie', 7_500);
    expect(run.remainingPower('zoomie', 8_000)).toBe(6_500);
  });

  it('never scores the same unearthed object twice', () => {
    const run = new RunState();
    expect(run.collectTreasure(TREASURE_CATALOG[0])).toBe(true);
    expect(run.collectTreasure(TREASURE_CATALOG[0])).toBe(false);
    expect(run.score).toBe(100);
  });

  it('gives Zoomies a strong speed boost and every ordinary treasure a unique sprite', () => {
    expect(ZOOMIE_SPEED_MULTIPLIER).toBeGreaterThanOrEqual(1.75);
    expect(Object.keys(TREASURE_SPRITE_FRAMES)).toHaveLength(TREASURE_CATALOG.length);
    expect(new Set(Object.values(TREASURE_SPRITE_FRAMES)).size).toBe(TREASURE_CATALOG.length);
  });
});

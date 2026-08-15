import { describe, expect, it } from 'vitest';
import { TREASURE_CATALOG } from '../src/game/data/content';
import { ORDINARY_DIG_SPOTS, PIRATE_DIG_SPOTS } from '../src/game/data/level';
import { activateDigSpots, selectOrdinaryTreasures } from '../src/game/systems/treasure';

const fixedRandom = () => .42;

describe('treasure selection', () => {
  it('prioritizes undiscovered collection entries', () => {
    const discovered = TREASURE_CATALOG.slice(0, 6).map(item => item.id);
    const selected = selectOrdinaryTreasures(discovered, 4, fixedRandom);
    expect(selected.slice(0, 2).every(item => !discovered.includes(item.id))).toBe(true);
  });

  it('activates four unique ordinary spots and exactly one pirate spot', () => {
    const active = activateDigSpots(ORDINARY_DIG_SPOTS, PIRATE_DIG_SPOTS, [], fixedRandom);
    expect(active).toHaveLength(5);
    expect(active.filter(spot => spot.treasure.kind === 'ordinary')).toHaveLength(4);
    expect(active.filter(spot => spot.treasure.kind === 'pirate')).toHaveLength(1);
    expect(new Set(active.map(spot => spot.id)).size).toBe(5);
    expect(active.every(spot => spot.dug === false)).toBe(true);
  });
});

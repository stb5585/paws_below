import { describe, expect, it } from 'vitest';
import { canCollectAlongPath, distancePointToSegment } from '../src/game/systems/collectibles';
import type { CollectibleDefinition } from '../src/game/types';

const food: CollectibleDefinition = {
  id: 'food-test', kind: 'food', position: { x: 2, y: 1 }, points: 10, pickupRadius: .9
};

describe('forgiving collectible pickup', () => {
  it('measures the swept path instead of only the final player position', () => {
    expect(distancePointToSegment(food.position, { x: 0, y: 1 }, { x: 4, y: 1 })).toBe(0);
    expect(canCollectAlongPath(food, { x: 0, y: 1 }, { x: 4, y: 1 }, () => true)).toBe(true);
  });

  it('respects the configured collection radius', () => {
    expect(canCollectAlongPath(food, { x: 0, y: 1.89 }, { x: 4, y: 1.89 }, () => true)).toBe(true);
    expect(canCollectAlongPath(food, { x: 0, y: 1.91 }, { x: 4, y: 1.91 }, () => true)).toBe(false);
  });

  it('does not pull a collectible through a blocked tile', () => {
    expect(canCollectAlongPath(food, { x: 2, y: 2 }, { x: 2, y: 2 }, (x, y) => !(x === 2 && y === 1))).toBe(false);
  });
});

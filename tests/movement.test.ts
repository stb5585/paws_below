import { describe, expect, it } from 'vitest';
import { canOccupyFootprint, PLAYER_COLLISION_RADIUS } from '../src/game/systems/movement';

describe('player wall collision', () => {
  const rectangularFloor = (x: number, y: number) => x >= 2 && x <= 5 && y >= 2 && y <= 5;

  it('keeps the complete player footprint inside floor cells', () => {
    const lastSafeCenter = 5.5 - PLAYER_COLLISION_RADIUS;
    expect(canOccupyFootprint(rectangularFloor, 5, 5)).toBe(true);
    expect(canOccupyFootprint(rectangularFloor, lastSafeCenter - .001, 4)).toBe(true);
    expect(canOccupyFootprint(rectangularFloor, lastSafeCenter + .001, 4)).toBe(false);
    expect(canOccupyFootprint(rectangularFloor, 4, lastSafeCenter + .001)).toBe(false);
  });

  it('cannot slip diagonally into a blocked corner', () => {
    const cornerBlocked = (x: number, y: number) => !(x === 3 && y === 3);
    expect(canOccupyFootprint(cornerBlocked, 2.4, 2.4)).toBe(false);
  });
});

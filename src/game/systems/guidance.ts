import type { ActiveDigSpot, GridPoint } from '../types';

export const TREASURE_BARK_RADIUS = 5;
export const TREASURE_REVEAL_MS = 4_500;

export function nearestUndugTreasure(
  origin: GridPoint,
  spots: ActiveDigSpot[],
  radius = TREASURE_BARK_RADIUS
): ActiveDigSpot | undefined {
  let nearest: ActiveDigSpot | undefined;
  let nearestDistance = radius;
  for (const spot of spots) {
    if (spot.dug) continue;
    const distance = Math.hypot(spot.x - origin.x, spot.y - origin.y);
    if (distance <= nearestDistance) { nearest = spot; nearestDistance = distance; }
  }
  return nearest;
}

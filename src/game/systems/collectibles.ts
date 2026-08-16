import type { CollectibleDefinition, GridPoint } from '../types';

export function closestPointOnSegment(point: GridPoint, from: GridPoint, to: GridPoint): GridPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return { ...from };
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return { x: from.x + dx * t, y: from.y + dy * t };
}

export function distancePointToSegment(point: GridPoint, from: GridPoint, to: GridPoint): number {
  const closest = closestPointOnSegment(point, from, to);
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

export function isSegmentClear(from: GridPoint, to: GridPoint, isWalkable: (x: number, y: number) => boolean): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / .18));
  for (let step = 0; step <= steps; step++) {
    const progress = step / steps;
    if (!isWalkable(
      Math.round(from.x + (to.x - from.x) * progress),
      Math.round(from.y + (to.y - from.y) * progress)
    )) return false;
  }
  return true;
}

export function canCollectAlongPath(
  collectible: CollectibleDefinition,
  from: GridPoint,
  to: GridPoint,
  isWalkable: (x: number, y: number) => boolean
): boolean {
  if (distancePointToSegment(collectible.position, from, to) > (collectible.pickupRadius ?? .9)) return false;
  const closest = closestPointOnSegment(collectible.position, from, to);
  return isSegmentClear(closest, collectible.position, isWalkable);
}

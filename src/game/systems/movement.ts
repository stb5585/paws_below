export const PLAYER_COLLISION_RADIUS = .3;

export function canOccupyFootprint(
  isFloorCell: (x: number, y: number) => boolean,
  x: number,
  y: number,
  radius = PLAYER_COLLISION_RADIUS
): boolean {
  const diagonal = radius / Math.SQRT2;
  const samples = [
    { x: 0, y: 0 },
    { x: radius, y: 0 }, { x: -radius, y: 0 },
    { x: 0, y: radius }, { x: 0, y: -radius },
    { x: diagonal, y: diagonal }, { x: diagonal, y: -diagonal },
    { x: -diagonal, y: diagonal }, { x: -diagonal, y: -diagonal }
  ];
  return samples.every(sample => isFloorCell(Math.round(x + sample.x), Math.round(y + sample.y)));
}

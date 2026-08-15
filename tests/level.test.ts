import { describe, expect, it } from 'vitest';
import { BURROW } from '../src/game/data/content';
import { COLLECTIBLES, JUMP_PATHS, ORDINARY_DIG_SPOTS, PIRATE_DIG_SPOTS, isFloorCell, isLavaCell } from '../src/game/data/level';

function reachableCells(): Set<string> {
  const seen = new Set<string>();
  const queue = [{ ...BURROW.start }];
  const jumpEdges = new Map<string, Array<{x:number;y:number}>>();
  for (const path of JUMP_PATHS) {
    for (let index = 0; index < path.length - 1; index++) {
      const a = path[index]; const b = path[index + 1];
      const ak = `${a.x},${a.y}`; const bk = `${b.x},${b.y}`;
      jumpEdges.set(ak, [...(jumpEdges.get(ak) ?? []), b]);
      jumpEdges.set(bk, [...(jumpEdges.get(bk) ?? []), a]);
    }
  }
  while (queue.length) {
    const point = queue.shift()!; const key = `${point.x},${point.y}`;
    if (seen.has(key)) continue; seen.add(key);
    const adjacent = [{x:point.x+1,y:point.y},{x:point.x-1,y:point.y},{x:point.x,y:point.y+1},{x:point.x,y:point.y-1}];
    for (const next of [...adjacent.filter(p => isFloorCell(p.x,p.y)), ...(jumpEdges.get(key) ?? [])]) {
      if (!seen.has(`${next.x},${next.y}`)) queue.push(next);
    }
  }
  return seen;
}

describe('handcrafted burrow map', () => {
  it('starts Pip on open floor with room to move in every screen direction', () => {
    expect(isFloorCell(BURROW.start.x, BURROW.start.y)).toBe(true);
    const screenDirections = [{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1},{x:1,y:1}];
    screenDirections.forEach(direction => {
      expect(isFloorCell(BURROW.start.x + direction.x, BURROW.start.y + direction.y)).toBe(true);
    });
  });

  it('contains the promised collectible count', () => {
    expect(COLLECTIBLES.filter(item => item.kind === 'food')).toHaveLength(30);
    expect(COLLECTIBLES.filter(item => item.kind === 'treat')).toHaveLength(6);
  });

  it('keeps ordinary walking cells out of lava', () => {
    for (let y=0;y<24;y++) for (let x=0;x<34;x++) expect(isFloorCell(x,y) && isLavaCell(x,y)).toBe(false);
  });

  it('makes the exit, collectibles, and every candidate dig spot reachable', () => {
    const reachable = reachableCells();
    const required = [BURROW.exit, ...COLLECTIBLES.map(item=>item.position), ...ORDINARY_DIG_SPOTS, ...PIRATE_DIG_SPOTS];
    required.forEach(point => expect(reachable.has(`${point.x},${point.y}`), `unreachable ${point.x},${point.y}`).toBe(true));
  });

  it('defines bidirectional step-by-step crossing paths', () => {
    JUMP_PATHS.forEach(path => {
      expect(path.length).toBeGreaterThanOrEqual(4);
      path.slice(1,-1).forEach(point => expect(isLavaCell(point.x,point.y)).toBe(true));
      expect(isFloorCell(path[0].x,path[0].y)).toBe(true);
      expect(isFloorCell(path.at(-1)!.x,path.at(-1)!.y)).toBe(true);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { DOG_FARM } from '../src/game/data/content';
import {
  FARM_COLLECTIBLES, FARM_DIG_SPOTS, FARM_HEIGHT, FARM_JUMP_PATHS, FARM_WIDTH,
  isFarmFloorCell, isFarmObstacleCell
} from '../src/game/data/farmLevel';

const key = (x:number,y:number) => `${x},${y}`;

function reachableFromStart(): Set<string> {
  const jumpEdges = new Map<string,string[]>();
  FARM_JUMP_PATHS.forEach(path => {
    const first = key(path[0].x,path[0].y); const lastPoint = path.at(-1)!; const last = key(lastPoint.x,lastPoint.y);
    jumpEdges.set(first,[...(jumpEdges.get(first)??[]),last]);
    jumpEdges.set(last,[...(jumpEdges.get(last)??[]),first]);
  });
  const seen = new Set([key(DOG_FARM.start.x,DOG_FARM.start.y)]);
  const queue = [{...DOG_FARM.start}];
  while(queue.length){
    const point=queue.shift()!;
    const adjacent=[{x:point.x+1,y:point.y},{x:point.x-1,y:point.y},{x:point.x,y:point.y+1},{x:point.x,y:point.y-1}]
      .filter(next=>isFarmFloorCell(next.x,next.y));
    const jumps=(jumpEdges.get(key(point.x,point.y))??[]).map(value=>{const [x,y]=value.split(',').map(Number);return{x,y};});
    for(const next of [...adjacent,...jumps]) if(!seen.has(key(next.x,next.y))){seen.add(key(next.x,next.y));queue.push(next);}
  }
  return seen;
}

describe('sunny farm field',()=>{
  it('contains 30 foods, six treats, and three bidirectional low-obstacle jumps',()=>{
    expect(FARM_COLLECTIBLES.filter(item=>item.kind==='food')).toHaveLength(30);
    expect(FARM_COLLECTIBLES.filter(item=>item.kind==='treat')).toHaveLength(6);
    expect(FARM_JUMP_PATHS).toHaveLength(3);
    FARM_JUMP_PATHS.forEach(path=>{
      expect(isFarmFloorCell(path[0].x,path[0].y)).toBe(true);
      expect(isFarmObstacleCell(path[1].x,path[1].y)).toBe(true);
      expect(isFarmFloorCell(path.at(-1)!.x,path.at(-1)!.y)).toBe(true);
    });
  });

  it('keeps ordinary movement out of obstacles and makes every goal item reachable',()=>{
    for(let y=0;y<FARM_HEIGHT;y++) for(let x=0;x<FARM_WIDTH;x++) {
      expect(isFarmFloorCell(x,y)&&isFarmObstacleCell(x,y)).toBe(false);
    }
    const reachable=reachableFromStart();
    [DOG_FARM.exit,...FARM_COLLECTIBLES.map(item=>item.position),...FARM_DIG_SPOTS]
      .forEach(point=>expect(reachable.has(key(point.x,point.y)), `unreachable ${key(point.x,point.y)}`).toBe(true));
  });
});

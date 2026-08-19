import type { BuriedTreasureDefinition, CollectibleDefinition, DigSpotDefinition, GridPoint, MapId } from '../types';
import type { WorldRenderProfile } from '../rendering/catalog';
import { FARM_TREASURE_CATALOG, PIRATE_TREASURE, TREASURE_CATALOG } from './content';
import {
  FARM_BLOCKS, FARM_COLLECTIBLES, FARM_DIG_SPOTS, FARM_HEIGHT, FARM_JUMP_PATHS, FARM_OBSTACLE_RECTS,
  FARM_WIDTH, isFarmFloorCell, isFarmObstacleCell
} from './farmLevel';
import {
  BLOCKS, COLLECTIBLES, JUMP_PATHS, LAVA_RECTS, ORDINARY_DIG_SPOTS, PIRATE_DIG_SPOTS,
  isFloorCell, isLavaCell, type GridRect
} from './level';

export interface WorldDefinition {
  id: MapId;
  title: string;
  subtitle: string;
  theme: 'burrow' | 'farm';
  width: number;
  height: number;
  blocks: GridRect[];
  obstacles: GridRect[];
  jumpPaths: GridPoint[][];
  collectibles: CollectibleDefinition[];
  ordinaryDigSpots: DigSpotDefinition[];
  specialDigSpots: DigSpotDefinition[];
  treasureCatalog: BuriedTreasureDefinition[];
  specialTreasure?: BuriedTreasureDefinition;
  rendering: WorldRenderProfile;
  isFloorCell: (x: number, y: number) => boolean;
  isObstacleCell: (x: number, y: number) => boolean;
}

export const UNDERGROUND_WORLD: WorldDefinition = {
  id:'underground',title:'Underground Burrow',subtitle:'Lava stones, glowing crystals, and lost household treasures',theme:'burrow',
  width:34,height:24,blocks:BLOCKS,obstacles:LAVA_RECTS,jumpPaths:JUMP_PATHS,collectibles:COLLECTIBLES,
  ordinaryDigSpots:ORDINARY_DIG_SPOTS,specialDigSpots:PIRATE_DIG_SPOTS,treasureCatalog:TREASURE_CATALOG,
  specialTreasure:PIRATE_TREASURE,isFloorCell,isObstacleCell:isLavaCell,
  rendering: {
    floorAsset:'burrow-floor',wallAsset:'burrow-wall',blockAsset:'burrow-wall',crossingAssets:['burrow-stone'],borderVariants:[],landmarks:[],
    decor: [
      {x:2,y:2,asset:'burrow-mushroom',size:72,animated:true},{x:8,y:3,asset:'burrow-web',size:64,animated:true},
      {x:13,y:1,asset:'burrow-crystal',size:74,animated:true},{x:18,y:9,asset:'burrow-lantern',size:63},
      {x:21,y:1,asset:'burrow-crystal',size:82,animated:true},{x:31,y:8,asset:'burrow-mushroom',size:76,animated:true},
      {x:22,y:13,asset:'burrow-web',size:62,animated:true},{x:32,y:21,asset:'burrow-crystal',size:80,animated:true},
      {x:10,y:13,asset:'burrow-root',size:82},{x:18,y:20,asset:'burrow-mushroom',size:76,animated:true},
      {x:30,y:1,asset:'burrow-root',size:68},{x:12,y:20,asset:'burrow-web',size:58,animated:true}
    ]
  }
};

export const FARM_WORLD: WorldDefinition = {
  id:'farm',title:'Sunny Farm Field',subtitle:'Find farm foods and treasures among corn, fences, and hay',theme:'farm',
  width:FARM_WIDTH,height:FARM_HEIGHT,blocks:FARM_BLOCKS,obstacles:FARM_OBSTACLE_RECTS,jumpPaths:FARM_JUMP_PATHS,
  collectibles:FARM_COLLECTIBLES,ordinaryDigSpots:FARM_DIG_SPOTS,specialDigSpots:[],treasureCatalog:FARM_TREASURE_CATALOG,
  isFloorCell:isFarmFloorCell,isObstacleCell:isFarmObstacleCell,
  rendering: {
    floorAsset:'farm-grass',wallAsset:'farm-corn',blockAsset:'farm-corn',crossingAssets:['farm-stone-a','farm-stone-b'],
    borderVariants:[
      {asset:'farm-boundary-fence',modulus:17,remainder:0},
      {asset:'farm-border-detail',modulus:17,remainder:8}
    ],
    landmarks:[{x:1,y:5,asset:'farm-landmark'},{x:32,y:17,asset:'farm-landmark'}],
    decor:[
      {x:7,y:9,asset:'farm-flowers',size:66},{x:10,y:21,asset:'farm-shrub',size:70},
      {x:17,y:12,asset:'farm-flowers',size:66},{x:23,y:8,asset:'farm-shrub',size:70},
      {x:26,y:21,asset:'farm-flowers',size:66},{x:31,y:13,asset:'farm-shrub',size:70},
      {x:4,y:20,asset:'farm-sign',size:72},{x:28,y:7,asset:'farm-sign',size:72}
    ]
  }
};

export const WORLDS: WorldDefinition[] = [UNDERGROUND_WORLD, FARM_WORLD];
export const getWorld = (id: MapId | undefined): WorldDefinition => WORLDS.find(world => world.id === id) ?? UNDERGROUND_WORLD;

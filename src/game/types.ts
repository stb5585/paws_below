export type GoalDefinition =
  | { type: 'reachExit'; exitId: string }
  | { type: 'collect'; target: number; collectibleKind: CollectibleKind }
  | { type: 'collectThenReachExit'; target: number; collectibleKind: CollectibleKind; exitId: string };

export interface AnimalDefinition {
  id: string;
  name: string;
  displayName: string;
  baseSpeed: number;
  spriteKey: string;
  spriteTexture: string;
  foodName: string;
  foodIcon: string;
  homeName: string;
  actionLabel: string;
  actionIcon: string;
  homeTexture: string;
  homeFrame: string;
  goal: GoalDefinition;
  portraitScale?: number;
  portraitOffsetX?: number;
  portraitOffsetY?: number;
  gameScale?: number;
  groundOffsetY?: number;
}

export interface LevelDefinition {
  id: string;
  animalId: string;
  mapId: MapId;
  mapKey: string;
  title: string;
  goal: GoalDefinition;
  start: GridPoint;
  exit: GridPoint;
}

export type MapId = 'underground' | 'farm';

export type CollectibleKind = 'food' | 'treat';
export type PowerKind = 'zoomie' | 'glow' | 'sniff';

export interface CollectibleDefinition {
  id: string;
  kind: CollectibleKind;
  position: GridPoint;
  points: number;
  power?: PowerKind;
  pickupRadius?: number;
}

export interface PowerDefinition {
  kind: PowerKind;
  label: string;
  durationMs: number;
  color: number;
}

export interface GridPoint { x: number; y: number }

export interface DigSpotDefinition extends GridPoint {
  id: string;
  pirateEligible?: boolean;
}

export type TreasureKind = 'ordinary' | 'pirate';

export interface BuriedTreasureDefinition {
  id: string;
  name: string;
  icon: string;
  kind: TreasureKind;
  points: number;
}

export interface ActiveDigSpot extends DigSpotDefinition {
  treasure: BuriedTreasureDefinition;
  dug: boolean;
}

export interface PlayerActions {
  moveX: number;
  moveY: number;
  jump: boolean;
  dig: boolean;
  bark: boolean;
  pause: boolean;
  confirm: boolean;
}

export interface RunResults {
  animalId: string;
  mapId: MapId;
  score: number;
  foodFound: number;
  requiredFood: number;
  totalFood: number;
  totalTreats: number;
  totalTreasures: number;
  treatsFound: number;
  treasures: BuriedTreasureDefinition[];
  pirateFound: boolean;
  isBest: boolean;
}

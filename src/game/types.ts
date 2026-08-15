export type GoalDefinition =
  | { type: 'reachExit'; exitId: string }
  | { type: 'collect'; target: number; collectibleKind: CollectibleKind };

export interface AnimalDefinition {
  id: string;
  name: string;
  displayName: string;
  baseSpeed: number;
  spriteKey: string;
  goal: GoalDefinition;
}

export interface LevelDefinition {
  id: string;
  animalId: string;
  mapKey: string;
  title: string;
  goal: GoalDefinition;
  start: GridPoint;
  exit: GridPoint;
}

export type CollectibleKind = 'food' | 'treat';
export type PowerKind = 'zoomie' | 'glow' | 'sniff';

export interface CollectibleDefinition {
  id: string;
  kind: CollectibleKind;
  position: GridPoint;
  points: number;
  power?: PowerKind;
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
  score: number;
  foodFound: number;
  treatsFound: number;
  treasures: BuriedTreasureDefinition[];
  pirateFound: boolean;
  isBest: boolean;
}

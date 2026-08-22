import { POWERS } from '../data/content';
import type { BuriedTreasureDefinition, PowerKind } from '../types';

export class RunState {
  score = 0;
  foodFound = 0;
  treatsFound = 0;
  treasures: BuriedTreasureDefinition[] = [];
  powers = new Map<PowerKind, number>();

  collectFood(): void { this.foodFound += 1; this.score += 10; }
  collectTreat(kind: PowerKind, now: number): void {
    this.treatsFound += 1;
    this.score += 50;
    this.refreshPower(kind, now);
  }
  refreshPower(kind: PowerKind, now: number): void { this.powers.set(kind, now + POWERS[kind].durationMs); }
  collectTreasure(treasure: BuriedTreasureDefinition): boolean {
    if (this.treasures.includes(treasure)) return false;
    this.treasures.push(treasure);
    this.score += treasure.points;
    return true;
  }
  isPowerActive(kind: PowerKind, now: number): boolean { return (this.powers.get(kind) ?? 0) > now; }
  remainingPower(kind: PowerKind, now: number): number { return Math.max(0, (this.powers.get(kind) ?? 0) - now); }
}

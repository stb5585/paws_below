import { PIRATE_TREASURE, TREASURE_CATALOG } from '../data/content';
import type { ActiveDigSpot, BuriedTreasureDefinition, DigSpotDefinition } from '../types';

export type RandomSource = () => number;

function shuffled<T>(items: T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export function selectOrdinaryTreasures(discovered: string[], count = 4, random: RandomSource = Math.random): BuriedTreasureDefinition[] {
  const newFinds = shuffled(TREASURE_CATALOG.filter(item => !discovered.includes(item.id)), random);
  const repeats = shuffled(TREASURE_CATALOG.filter(item => discovered.includes(item.id)), random);
  return [...newFinds, ...repeats].slice(0, count);
}

export function activateDigSpots(
  ordinarySpots: DigSpotDefinition[],
  pirateSpots: DigSpotDefinition[],
  discovered: string[],
  random: RandomSource = Math.random
): ActiveDigSpot[] {
  if (ordinarySpots.length < 4 || pirateSpots.length < 1) throw new Error('The level needs four ordinary and one pirate dig spot.');
  const spots = shuffled(ordinarySpots, random).slice(0, 4);
  const treasures = selectOrdinaryTreasures(discovered, 4, random);
  const active = spots.map((spot, index) => ({ ...spot, treasure: treasures[index], dug: false }));
  const pirate = shuffled(pirateSpots, random)[0];
  return [...active, { ...pirate, treasure: PIRATE_TREASURE, dug: false }];
}

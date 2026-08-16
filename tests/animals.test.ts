import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANIMALS, BUNNY, DOG, getAnimal, getLevelForAnimal } from '../src/game/data/content';

describe('playable animals', () => {
  it('keeps Pip and adds Mochi as distinct data-driven choices', () => {
    expect(ANIMALS.map(animal => animal.id)).toEqual([DOG.id, BUNNY.id]);
    expect(getAnimal('cream-bunny')).toBe(BUNNY);
    expect(BUNNY.spriteKey).not.toBe(DOG.spriteKey);
    expect(BUNNY.foodIcon).toBe('🥕');
  });

  it('keeps the underground goal while attaching the collection quest to the farm', () => {
    const underground = getLevelForAnimal(BUNNY.id, 'underground');
    const farm = getLevelForAnimal(BUNNY.id, 'farm');
    expect(underground.goal).toEqual({ type: 'reachExit', exitId: 'cozy-rabbit-pen' });
    expect(farm.goal).toEqual({ type: 'collectThenReachExit', collectibleKind: 'food', target: 12, exitId: 'red-barn' });
    expect(BUNNY.homeName).toBe('rabbit pen');
    expect(BUNNY.actionLabel).toBe('HONK');
  });

  it('ships the generated bunny and rabbit atlas assets', () => {
    expect(existsSync('public/assets/bunny-animations.webp')).toBe(true);
    expect(existsSync('public/assets/pip-animations.webp')).toBe(true);
    expect(existsSync('public/assets/rabbit-atlas.webp')).toBe(true);
    expect(existsSync('public/assets/farm-atlas.webp')).toBe(true);
    expect(existsSync('public/assets/farm-treasures.webp')).toBe(true);
    expect(existsSync('public/assets/household-treasures.webp')).toBe(true);
    expect(existsSync('public/assets/burrow-atlas.webp')).toBe(true);
  });

  it('keeps one canonical file instead of checked-in numbered asset revisions', () => {
    const numberedAssets = readdirSync('public/assets').filter(name => /-v\d+\.(?:png|webp|avif)$/i.test(name));
    expect(numberedAssets).toEqual([]);
  });
});

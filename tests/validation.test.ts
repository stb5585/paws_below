import { describe, expect, it } from 'vitest';
import { ANIMALS, LEVELS } from '../src/game/data/content';
import { WORLDS } from '../src/game/data/worlds';
import { ENVIRONMENT_ASSETS } from '../src/game/rendering/catalog';
import { GRID_ASSETS } from '../src/game/systems/assets';
import { validateGameContent, type ContentValidationInput } from '../src/game/systems/validation';

const currentContent = (): ContentValidationInput => ({
  worlds: WORLDS, levels: LEVELS, animals: ANIMALS,
  renderAssets: ENVIRONMENT_ASSETS, gridAssets: GRID_ASSETS
});

describe('game content validation', () => {
  it('accepts every current animal, level, world, and render asset', () => {
    expect(validateGameContent(currentContent())).toEqual([]);
  });

  it('reports an atlas frame with enough context to repair it', () => {
    const invalidAssets = {
      ...ENVIRONMENT_ASSETS,
      'burrow-wall': { ...ENVIRONMENT_ASSETS['burrow-wall'], frame: 'env-99' }
    };
    expect(validateGameContent({ ...currentContent(), renderAssets: invalidAssets }))
      .toContain('render asset burrow-wall: invalid frame env-99');
  });

  it('reports invalid placements and unreachable level coordinates', () => {
    const underground = WORLDS[0];
    const invalidWorld = {
      ...underground,
      rendering: {
        ...underground.rendering,
        decor: [...underground.rendering.decor, { x: 99, y: 99, asset: 'burrow-crystal' as const }]
      }
    };
    const invalidLevel = { ...LEVELS[0], start: { x: 4, y: 3 } };
    const issues = validateGameContent({
      ...currentContent(), worlds: [invalidWorld, WORLDS[1]], levels: [invalidLevel, ...LEVELS.slice(1)]
    });
    expect(issues).toContain('world underground: decor burrow-crystal is outside at 99,99');
    expect(issues).toContain('level burrow-maze-1: start is not on floor at 4,3');
  });
});

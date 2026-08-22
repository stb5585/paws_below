import { describe, expect, it } from 'vitest';
import { POWERS } from '../src/game/data/content';
import type { PowerKind } from '../src/game/types';

describe('power explanations', () => {
  it('gives every power a named icon, duration, and concise gameplay explanation', () => {
    const kinds: PowerKind[] = ['zoomie', 'glow', 'sniff'];
    expect(Object.keys(POWERS).sort()).toEqual([...kinds].sort());
    kinds.forEach(kind => {
      const power = POWERS[kind];
      expect(power.kind).toBe(kind);
      expect(power.label.length).toBeGreaterThan(3);
      expect(power.icon.length).toBeGreaterThan(0);
      expect(power.summary).toMatch(/\.$/);
      expect(power.detail).toMatch(/Movement|movement/);
      expect(power.durationMs % 1_000).toBe(0);
      expect(power.durationMs).toBeGreaterThanOrEqual(6_000);
    });
  });
});

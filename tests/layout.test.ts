import { describe, expect, it } from 'vitest';
import { calculateGameLayout } from '../src/game/systems/layout';

describe('responsive safe-area layout', () => {
  it('uses the authored 16:9 region directly at its reference size', () => {
    expect(calculateGameLayout(1280, 720)).toMatchObject({ safeX: 0, safeY: 0, safeWidth: 1280, safeHeight: 720 });
  });

  it('centers the safe region while exposing extra world on wide screens', () => {
    expect(calculateGameLayout(1560, 720)).toMatchObject({ safeX: 140, safeY: 0, safeWidth: 1280, safeHeight: 720 });
    expect(calculateGameLayout(1600, 720)).toMatchObject({ safeX: 160, safeY: 0, safeWidth: 1280, safeHeight: 720 });
  });

  it('centers the safe region vertically on a 4:3 display', () => {
    expect(calculateGameLayout(1280, 960)).toMatchObject({ safeX: 0, safeY: 120, safeWidth: 1280, safeHeight: 720 });
  });

  it('keeps controls inside asymmetric device insets', () => {
    expect(calculateGameLayout(1600, 720, { top: 0, right: 40, bottom: 0, left: 80 })).toMatchObject({
      safeX: 180, safeY: 0, safeWidth: 1280, safeHeight: 720
    });
  });
});

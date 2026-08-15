import { describe, expect, it } from 'vitest';
import { shouldShowTouchControls } from '../src/game/systems/device';

const desktop = { maxTouchPoints: 0, hasTouchEvent: false, hasCoarsePointer: false };

describe('touch control detection', () => {
  it('detects hybrid touchscreen laptops through maxTouchPoints', () => {
    expect(shouldShowTouchControls('auto', { ...desktop, maxTouchPoints: 10 })).toBe(true);
  });

  it('detects coarse pointers and touch events', () => {
    expect(shouldShowTouchControls('auto', { ...desktop, hasCoarsePointer: true })).toBe(true);
    expect(shouldShowTouchControls('auto', { ...desktop, hasTouchEvent: true })).toBe(true);
  });

  it('allows the player to force controls on or off', () => {
    expect(shouldShowTouchControls('on', desktop)).toBe(true);
    expect(shouldShowTouchControls('off', { ...desktop, maxTouchPoints: 5 })).toBe(false);
  });
});

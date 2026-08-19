import { describe, expect, it } from 'vitest';
import { shouldShowOrientationGuard } from '../src/orientation';

describe('orientation guard', () => {
  it('only blocks touch-capable portrait viewports', () => {
    expect(shouldShowOrientationGuard(true, [{ width: 390, height: 844 }])).toBe(true);
    expect(shouldShowOrientationGuard(true, [{ width: 844, height: 390 }])).toBe(false);
    expect(shouldShowOrientationGuard(false, [{ width: 390, height: 844 }])).toBe(false);
  });

  it('unblocks as soon as a live viewport reports landscape', () => {
    expect(shouldShowOrientationGuard(true, [
      { width: 390, height: 844 },
      { width: 844, height: 390 }
    ])).toBe(false);
  });
});

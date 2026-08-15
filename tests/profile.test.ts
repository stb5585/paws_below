import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, PROFILE_KEY, addDiscoveries, loadProfile, sanitizeProfile, saveProfile } from '../src/game/systems/profile';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe('player profile', () => {
  it('recovers from corrupted or unknown saves', () => {
    const bad = { getItem: () => '{not-json' };
    expect(loadProfile(bad)).toEqual(DEFAULT_PROFILE);
    expect(sanitizeProfile({ version: 99, bestScore: 200 })).toEqual(DEFAULT_PROFILE);
  });

  it('sanitizes values and removes duplicate discoveries', () => {
    expect(sanitizeProfile({
      version: 1, bestScore: -5, collection: ['sock', 'sock', 7], pirateBadge: 1,
      muted: true, fullBrightness: false, tutorialSeen: true
    })).toEqual({ ...DEFAULT_PROFILE, collection: ['sock'], muted: true, tutorialSeen: true });
  });

  it('persists discoveries, best score settings, and pirate badge', () => {
    const storage = new MemoryStorage();
    const profile = addDiscoveries({ ...DEFAULT_PROFILE, bestScore: 420 }, ['sock', 'keys'], true);
    saveProfile(profile, storage);
    expect(storage.data.has(PROFILE_KEY)).toBe(true);
    expect(loadProfile(storage)).toEqual(profile);
  });

  it('sanitizes the persistent touch-control preference', () => {
    expect(sanitizeProfile({ ...DEFAULT_PROFILE, touchControls: 'on' }).touchControls).toBe('on');
    expect(sanitizeProfile({ ...DEFAULT_PROFILE, touchControls: 'invalid' }).touchControls).toBe('auto');
  });
});

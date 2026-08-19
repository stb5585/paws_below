import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE, PROFILE_KEY, addDiscoveries, loadProfile, resetBestScores,
  sanitizeProfile, saveProfile
} from '../src/game/systems/profile';

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
    })).toEqual({ ...DEFAULT_PROFILE, collection: ['sock'], muted: true, tutorialSeen: true, seenAnimals: ['white-dog'] });
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

  it('migrates existing saves to follow-touch and preserves joystick mode', () => {
    const oldSave = { ...DEFAULT_PROFILE } as Partial<typeof DEFAULT_PROFILE>;
    delete oldSave.touchMovement;
    expect(sanitizeProfile(oldSave).touchMovement).toBe('follow');
    expect(sanitizeProfile({ ...DEFAULT_PROFILE, touchMovement: 'joystick' }).touchMovement).toBe('joystick');
  });

  it('migrates per-animal progress without losing the legacy dog score', () => {
    const migrated = sanitizeProfile({
      version: 1, bestScore: 720, collection: [], pirateBadge: false, muted: false,
      fullBrightness: false, tutorialSeen: true, touchControls: 'auto'
    });
    expect(migrated.selectedAnimalId).toBe('white-dog');
    expect(migrated.seenAnimals).toEqual(['white-dog']);
    expect(migrated.bestScores).toEqual({ 'white-dog': 720, 'cream-bunny': 0 });

    const bunny = sanitizeProfile({ ...DEFAULT_PROFILE, selectedAnimalId: 'cream-bunny', seenAnimals: ['cream-bunny'], bestScores: { 'cream-bunny': 350 } });
    expect(bunny.selectedAnimalId).toBe('cream-bunny');
    expect(bunny.bestScores['cream-bunny']).toBe(350);
  });

  it('returns independent default score records for new players', () => {
    const empty = { getItem: () => null };
    const first = loadProfile(empty); first.bestScores['cream-bunny'] = 999;
    expect(loadProfile(empty).bestScores['cream-bunny']).toBe(0);
  });

  it('adds versioned per-animal appearance defaults to existing saves', () => {
    const oldSave = { ...DEFAULT_PROFILE } as Partial<typeof DEFAULT_PROFILE>;
    delete oldSave.appearance;
    const migrated = sanitizeProfile(oldSave);
    expect(migrated.appearance).toEqual(DEFAULT_PROFILE.appearance);
    expect(migrated.appearance).not.toBe(DEFAULT_PROFILE.appearance);
    expect(migrated.appearance.animals['white-dog'].extras).not.toBe(DEFAULT_PROFILE.appearance.animals['white-dog'].extras);
  });

  it('sanitizes appearance identifiers and preserves valid cosmetic slots', () => {
    const profile = sanitizeProfile({
      ...DEFAULT_PROFILE,
      appearance: {
        version: 1,
        animals: {
          'white-dog': {
            palette: 'warm-gold', homeStyle: '<script>',
            extras: { collar: 'mint-stars', '<bad>': 'nope' }
          }
        }
      }
    });
    expect(profile.appearance.animals['white-dog']).toEqual({
      palette: 'warm-gold', homeStyle: 'classic-doghouse', extras: { collar: 'mint-stars' }
    });
  });

  it('resets only aggregate and per-animal best scores', () => {
    const profile = sanitizeProfile({
      ...DEFAULT_PROFILE, bestScore: 900, bestScores: { 'white-dog': 900, 'cream-bunny': 450 },
      collection: ['striped-sock'], pirateBadge: true, muted: true,
      appearance: { version: 1, animals: { 'white-dog': {
        palette: 'warm-gold', homeStyle: 'classic-doghouse', extras: { collar: 'mint-stars' }
      } } }
    });
    const reset = resetBestScores(profile);
    expect(reset.bestScore).toBe(0);
    expect(reset.bestScores).toEqual({ 'white-dog': 0, 'cream-bunny': 0 });
    expect(reset.collection).toEqual(['striped-sock']);
    expect(reset.pirateBadge).toBe(true);
    expect(reset.muted).toBe(true);
    expect(reset.appearance).toEqual(profile.appearance);
  });
});
